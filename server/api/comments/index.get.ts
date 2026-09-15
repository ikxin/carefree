import { comments } from '#server/database/schema'
import { auth } from '#server/utils/auth'
import { getCommentContentId, getComments, type CommentNode } from '#server/utils/comments'
import { eq } from 'drizzle-orm'

function findRootComment(comment: CommentNode, nodesById: Map<string, CommentNode>) {
  const visited = new Set<string>()
  let current = comment

  while (current.parentId) {
    if (visited.has(current.id)) {
      return null
    }

    visited.add(current.id)
    const parent = nodesById.get(current.parentId)

    if (!parent) {
      break
    }

    current = parent
  }

  return current
}

export default defineEventHandler(async (event) => {
  const contentId = await getCommentContentId(getQuery(event).contentPublicId)
  const [nodes, session] = await Promise.all([
    getComments(eq(comments.contentId, contentId)),
    auth.api.getSession({ headers: event.headers }),
  ])
  const nodesById = new Map(nodes.map((comment) => [comment.id, comment]))
  const rootComments: CommentNode[] = []

  for (const comment of nodes) {
    const parent = comment.parentId ? nodesById.get(comment.parentId) : undefined
    const root = findRootComment(comment, nodesById)

    if (parent && root && root.id !== comment.id) {
      comment.replyTo = {
        id: parent.id,
        name: parent.author.name,
      }
      root.replies.push(comment)
    } else {
      rootComments.push(comment)
    }
  }

  return {
    comments: rootComments,
    total: nodes.length,
    authenticated: Boolean(session?.user),
  }
})
