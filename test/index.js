/* eslint-env mocha */
const assert = require('assert')
const mkReq = require('supertest')
const { mkRepo, mkApp } = require('..')
const msg = require('../lib/msg')

const repo = mkRepo()
const app = mkApp(repo)
const req = mkReq(app.callback())

const BOOK = {
  title: 'foo',
  date: '1000-01-01',
  author: 'foo',
  description: 'foo',
  image: 'foo'
}

before(() => repo.start())
after(() => repo.stop())

describe('create book', () => {
  beforeEach(repo.deleteAllBooks)
  it('creates book', async () => {
    const res = await req
      .post('/books')
      .send(BOOK)
      .expect(200)
      .expect('Content-Type', /json/)
    const book = res.body
    assert.ok(book.id)
    Object.keys(BOOK).forEach((k) => assert.strictEqual(BOOK[k], book[k]))
    assert.strictEqual(1, await repo.countBooks())
  })
  it('throws 400 on invalid date', async () => {
    await req
      .post('/books')
      .send({ ...BOOK, date: 'foo' })
      .expect(400, msg.ERR_INVALID_DATE)
    assert.strictEqual(0, await repo.countBooks())
  })
  it('throws 400 on empty fields', async () => {
    await req
      .post('/books')
      .send({ ...BOOK, date: null })
      .expect(400, msg.ERR_EMPTY_FIELDS)
    assert.strictEqual(0, await repo.countBooks())
  })
})
describe('update book', () => {
  let book
  beforeEach(async () => {
    await repo.deleteAllBooks()
    book = await repo.createBook(BOOK)
  })
  it('updates book', async () => {
    const input = updated(BOOK)
    const res = await req
      .put(`/books/${book.id}`)
      .send(input)
      .expect(200)
      .expect('Content-Type', /json/)
    const book_ = res.body
    assert.strictEqual(book.id, book_.id)
    Object.keys(input).forEach((k) => assert.strictEqual(input[k], book_[k]))
    assert.strictEqual(1, await repo.countBooks())
  })
  it('throws 400 on invalid date', async () => {
    const input = { ...updated(BOOK), date: 'foo' } // Pass invalid date
    await req
      .put(`/books/${book.id}`)
      .send(input)
      .expect(400, msg.ERR_INVALID_DATE)
  })
  it('throws 404 on non-existent book', async () => {
    const input = { ...updated(BOOK) }
    await req
      .put(`/books/0`)
      .send(input)
      .expect(404, msg.ERR_BOOK_NOT_FOUND)
  })
  it('preserves unchanged fields', async () => {
    const input = { ...updated(BOOK), title: undefined } // Preserve title
    const res = await req
      .put(`/books/${book.id}`)
      .send(input)
      .expect(200)
      .expect('Content-Type', /json/)
    const book_ = res.body
    assert.strictEqual(book.id, book_.id)
    assert.strictEqual(book.title, book_.title)
    Object.keys(input).forEach((k) => {
      if (k === 'title') return
      assert.strictEqual(input[k], book_[k])
    })
    assert.strictEqual(1, await repo.countBooks())
  })
})
describe('list books', () => {
  before(async () => {
    await repo.deleteAllBooks()
    let inputs = []
    for (let i = 0; i < 100; i += 1) inputs.push(prefixed(i, BOOK))
    await repo.createBooks(inputs)
    assert.strictEqual(100, await repo.countBooks())
  })
  it('responds with array of books, default limit is 10', async () => {
    const res = await req
      .get('/books')
      .expect(200)
      .expect('Content-Type', /json/)
    assert.strictEqual(10, res.body.length)
  })
  it('accepts limit and offset', async () => {
    const res = await req
      .get('/books?offset=10&limit=20')
      .expect(200)
      .expect('Content-Type', /json/)
    assert.strictEqual(20, res.body.length)
    assert.strictEqual('10-foo', res.body[0].title)
  })
  it('rejects invalid sort', async () => {
    await req.get('/books?sort=foo').expect(400, msg.ERR_INVALID_FIELD)
  })
  it('accepts ASC sort', async () => {
    const res = await req
      .get('/books?sort=title,date')
      .expect(200)
      .expect('Content-Type', /json/)
    assert.strictEqual('0-foo', res.body[0].title)
  })
  it('accepts DESC sort', async () => {
    const res = await req
      .get('/books?sort=-title,date')
      .expect(200)
      .expect('Content-Type', /json/)
    assert.strictEqual('99-foo', res.body[0].title)
  })
  it('rejects invalid filter')
  it('accepts valid filter')
})

const updated = (obj) => {
  return Object.keys(obj).reduce((a, k) => {
    const v = k === 'date' ? obj[k].replace(/1/g, 2) : `${obj[k]}-updated`
    return { ...a, [k]: v }
  }, {})
}

const prefixed = (i, obj) => {
  return Object.keys(obj).reduce((a, k) => {
    const v = k === 'date' ? obj[k] : `${i}-${obj[k]}`
    return { ...a, [k]: v }
  }, {})
}
