// prevents relogins and accessing sensitive routes without logins

import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    async function middleware(req) {
        const pathname = req.nextUrl.pathname

        console.log("Pathname: ", pathname);

        // Manage the route protection
        const isAuth = await getToken({ req });
        const isLoginPage = pathname.startsWith('/login');

        const sensitiveRoutes = ['/dashboard'];
        const isAccessingSensitiveRoutes = sensitiveRoutes.some((route) => pathname.startsWith(route));

        if (isLoginPage) {
            if (isAuth) {
                console.log("Login success, you are being redirected!");

                return NextResponse.redirect(new URL('/dashboard', req.url));
            }

            return NextResponse.next();
        }

        if (!isAuth && isAccessingSensitiveRoutes) {
            console.log("not authenticated or accessing sensitive routes");

            return NextResponse.redirect(new URL('/login', req.url));
        }

        if (pathname === '/') {
            console.log("Login page redirection");

            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }, {
    callbacks: {
        async authorized() { // prevents infinite redirect to the same page
            return true;
        },
    }
}
)

export const config = {
    matcher: ['/', '/login', '/dashboard/:path*'],
}