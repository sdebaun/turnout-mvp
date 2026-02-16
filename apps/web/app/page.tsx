import { incrementCounter } from './actions'

export default async function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Hello Turnout</h1>
      <p className="mb-4">Bootstrap successful! 🎉</p>

      <form action={incrementCounter}>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Server Action
        </button>
      </form>
    </main>
  )
}
