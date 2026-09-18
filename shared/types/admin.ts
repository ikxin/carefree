export type AdminContentStatus = 'draft' | 'review' | 'publish'

export type AdminCommentStatus = 'pending' | 'approved' | 'rejected'

export type AdminUserRole = 'admin' | 'user'

export type AdminUserStatus = 'active' | 'banned'

export type AdminDate = string | Date

export interface AdminCategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  contentCount: number
  createdAt: AdminDate
  updatedAt: AdminDate
}

export interface AdminTagItem {
  id: string
  name: string
  slug: string
  description: string | null
  contentCount: number
  createdAt: AdminDate
  updatedAt: AdminDate
}

export interface AdminContentListItem {
  id: string
  title: string
  slug: string | null
  description: string | null
  content: string
  type: 'article'
  status: AdminContentStatus
  author: {
    id: string
    name: string
    image: string | null
  }
  category: {
    id: string
    name: string
    slug: string
  } | null
  tags: Array<{
    id: string
    name: string
    slug: string
  }>
  views: number
  commentCount: number
  createdAt: AdminDate
  updatedAt: AdminDate
}

export interface AdminContentListResponse {
  contents: AdminContentListItem[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface AdminCommentItem {
  id: string
  contentId: string
  contentTitle: string
  contentSlug: string | null
  parentId: string | null
  content: string
  status: AdminCommentStatus
  author: {
    name: string
    email: string | null
    url: string | null
  }
  createdAt: string
  updatedAt: string
}

export interface AdminCommentListResponse {
  comments: AdminCommentItem[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface AdminUserItem {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: AdminUserRole
  status: AdminUserStatus
  banned: boolean
  banReason: string | null
  banExpires: AdminDate | null
  articleCount: number
  commentCount: number
  createdAt: AdminDate
  updatedAt: AdminDate
}

export interface AdminUserListResponse {
  users: AdminUserItem[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface AdminUserSession {
  id: string
  expiresAt: AdminDate
  ipAddress: string | null
  userAgent: string | null
  createdAt: AdminDate
  updatedAt: AdminDate
}

export interface AdminUserTransferTarget {
  id: string
  name: string
  email: string
  role: AdminUserRole
}

export interface AdminUserDetail extends AdminUserItem {
  contentCount: number
  isSelf: boolean
  isLastAdmin: boolean
  sessions: AdminUserSession[]
  transferTargets: AdminUserTransferTarget[]
}

export interface AdminDashboardResponse {
  stats: {
    totalArticles: number
    publishedArticles: number
    draftArticles: number
    reviewArticles: number
    totalViews: number
    weeklyComments: number
    pendingComments: number
  }
  series: {
    labels: string[]
    articles: number[]
    comments: number[]
    topArticles: Array<{
      title: string
      slug: string | null
      views: number
    }>
  }
  recentContents: AdminContentListItem[]
  recentComments: AdminCommentItem[]
  range: 7 | 30 | 90
  syncedAt: string
}
