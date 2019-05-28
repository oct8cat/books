const App = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const { listBooks, createBook, updateBook } = require('./controllers')
const msg = require('./msg')

exports.mkApp = (repo) => {
  const app = new App()
  const router = new Router()
  Object.assign(app.context, { repo })
  app.use(handleErr)
  app.use(bodyParser())
  router.get('/books', listBooks)
  router.post('/books', createBook)
  router.put('/books/:bookId', updateBook)
  app.use(router.routes())
  app.use(router.allowedMethods())
  return app
}

const handleErr = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    switch (err.message) {
      case msg.ERR_BOOK_NOT_FOUND:
        return ctx.throw(404, err.message)
      case msg.ERR_INVALID_DATE:
      case msg.ERR_EMPTY_FIELDS:
      case msg.ERR_INVALID_FIELD:
        return ctx.throw(400, err.message)
      default:
        return ctx.throw(err)
    }
  }
}
