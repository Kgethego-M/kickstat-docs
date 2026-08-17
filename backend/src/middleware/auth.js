const isTestEnv = process.env.NODE_ENV === 'test'

let clerkMiddleware, requireAuth, getAuth

if (isTestEnv) {
  clerkMiddleware = () => (req, res, next) => next()
  requireAuth = () => (req, res, next) => next()
  getAuth = (req) => ({
    userId: req.headers['x-test-clerk-user-id'] || 'test_clerk_user',
  })
} else {
  ;({ clerkMiddleware, requireAuth, getAuth } = require('@clerk/express'))
}

module.exports = { clerkMiddleware, requireAuth, getAuth }
