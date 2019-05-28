const { mkRepo, mkApp } = require('..')

const main = async () => {
  const repo = mkRepo()
  const app = mkApp(repo)
  await repo.start()
  app.listen(process.env.PORT || 3000)
}

if (require.main === module) main()
