1. later we can search image according to days!
2. fix home page loading? right now loading with wrong data not looking good? >>>> DONE
3. check for notification tab
4. onboarding rectification
5. check if water loggin is done or not!
6. after opening app if we have to show paywall screen it must be exactly same as onboarding paywall
   i

showing this error why logout from one account but only show once.

ERROR [CONVEX M(userPreferences:syncSubscriptionStatus)] [Request ID: e3b7e0cf13246a12] Server Error
Uncaught ConvexError: Unauthenticated
at handler (../convex/userPreferences.ts:211:28)

Code: metroServerLogs.native.ts
103 | }
104 |

> 105 | class NamelessError extends Error {

      | ^

106 | name = '';
107 | }
108 | function captureCurrentStack() {

security --------

no one else can write in DB for other user. auth check in every API?
