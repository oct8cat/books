exports.listBooks = async (ctx) => {
  const sort = ctx.query.sort || 'id'
  const limit = +ctx.query.limit || 10
  const offset = +ctx.query.offset || 0
  ctx.body = await ctx.repo.listBooks({ sort, limit, offset })
}
exports.createBook = async (ctx) => {
  ctx.body = await ctx.repo.createBook(ctx.request.body)
}
exports.updateBook = async (ctx) => {
  ctx.body = await ctx.repo.updateBook(ctx.params.bookId, ctx.request.body)
}
