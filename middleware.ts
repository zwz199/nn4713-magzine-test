import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Clerk 身份验证中间件
 */
export const config = {
  // 这里设置白名单，防止静态资源被拦截
  matcher: ['/((?!.*\\..*|_next|/sign-in|/auth).*)', '/', '/(api|trpc)(.*)']
}

// 限制登录访问的路由
const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)'
])

// 限制权限访问的路由
const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

/**
 * 没有配置权限相关功能的返回
 * @param req
 * @param ev
 * @returns
 */
const noAuthMiddleware = async (req, ev) => {
  // 如果没有配置 Clerk 相关环境变量，返回一个默认响应或者继续处理请求
  return NextResponse.next()
}

/**
 * 鉴权中间件
 */
const authMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware(
      (auth, req) => {
        // 限制管理员路由访问权限
        if (isTenantAdminRoute(req)) {
          auth().protect(has => {
            return (
              has({ permission: 'org:sys_memberships:manage' }) ||
              has({ permission: 'org:sys_domains_manage' })
            )
          })
        }
        // 限制组织路由访问权限
        if (isTenantRoute(req)) auth().protect()
      }
      // { debug: process.env.npm_lifecycle_event === 'dev' } // 开发调试模式打印日志
    )
  : noAuthMiddleware

export default authMiddleware