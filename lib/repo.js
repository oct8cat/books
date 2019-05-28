const mysql = require('mysql')
const util = require('util')
const settings = require('../settings')
const msg = require('./msg')

exports.mkRepo = () => {
  const db = mysql.createConnection(settings.dbUrl)
  const q = util.promisify(db.query.bind(db))
  return {
    start: util.promisify(db.connect.bind(db)),
    stop: util.promisify(db.end.bind(db)),
    listBooks: listBooks(q),
    updateBook: updateBook(q),
    createBook: createBook(q),
    createBooks: createBooks(q),
    deleteAllBooks: deleteAllBooks(q),
    countBooks: countBooks(q)
  }
}

const getBook = (q) => async (bookId) => {
  return (await q('select * from books where id=?', [bookId]))[0]
}

const createBook = (q) => async (input) => {
  try {
    const { insertId } = await q(
      'insert into books(title, date, author, description, image) values ?',
      [[toBook(input)]]
    )
    return getBook(q)(insertId)
  } catch (err) {
    handleErr(err)
  }
}

const createBooks = (q) => async (inputs) => {
  try {
    await q(
      'insert into books(title, date, author, description, image) values ?',
      [inputs.map(toBook)]
    )
  } catch (err) {
    handleErr(err)
  }
}

const updateBook = (q) => async (bookId, input) => {
  const book = await getBook(q)(bookId)
  if (!book) throw new Error(msg.ERR_BOOK_NOT_FOUND)
  if (!Object.keys(input).length) return book
  try {
    await q(`update books set ? where id=?`, [input, bookId])
    return getBook(q)(book.id)
  } catch (err) {
    handleErr(err)
  }
}

const listBooks = (q) => async (props = {}) => {
  const sort = !props.sort
    ? 'id asc'
    : props.sort
        .split(',')
        .map((v) => {
          const dir = v.charAt(0) === '-' ? 'desc' : 'asc'
          const k = dir === 'desc' ? v.substr(1) : v
          return mysql.format(`?? ${dir}`, [k])
        })
        .join(', ')
  const limit = props.limit || 10
  const offset = props.offset || 0
  try {
    const res = await q(
      `select * from books order by ${sort} limit ? offset ?`,
      [limit, offset]
    )
    return res
  } catch (err) {
    handleErr(err)
  }
}

const deleteAllBooks = (q) => () => {
  return q('delete from books')
}

const countBooks = (q) => async () => {
  return (await q('select count(*) as count from books'))[0].count
}

const toBook = (obj) => [
  obj.title,
  obj.date,
  obj.author,
  obj.description,
  obj.image
]

const handleErr = (err) => {
  switch (err.code) {
    case 'ER_TRUNCATED_WRONG_VALUE':
      throw new Error(msg.ERR_INVALID_DATE)
    case 'ER_BAD_NULL_ERROR':
      throw new Error(msg.ERR_EMPTY_FIELDS)
    case 'ER_BAD_FIELD_ERROR':
      throw new Error(msg.ERR_INVALID_FIELD)
    default:
      throw err
  }
}
