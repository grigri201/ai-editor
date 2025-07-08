import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 拦截 source map 相关的请求
  if (
    pathname.includes('/_next/src/') ||
    pathname.includes('/_next/static/src/') ||
    pathname.includes('/src/resources/') ||
    pathname.includes('/_next/internal/') ||
    pathname.includes('/_next/static/chunks/src/') ||
    pathname.includes('/_next/static/runtime.ts') ||
    pathname.includes('/.well-known/appspecific/com.chrome.devtools.json')
  ) {
    // 返回空响应，避免 404 错误
    return new NextResponse(null, { status: 204 })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/_next/src/:path*',
    '/_next/static/src/:path*',
    '/_next/internal/:path*',
    '/_next/static/chunks/src/:path*',
    '/_next/static/runtime.ts',
    '/src/resources/:path*',
    '/.well-known/:path*'
  ],
}