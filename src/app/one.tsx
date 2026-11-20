
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-800 p-6 text-white">
        <h1 className="text-2xl font-bold">
          Milk Collection Centre Tracker
        </h1>
        <p className="mt-2 text-green-100">
          Manage farmers and daily milk collections
        </p>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          Dashboard
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-gray-500">Total Farmers</h3>
            <p className="mt-2 text-3xl font-bold text-green-800">0</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-gray-500">Milk Collected Today</h3>
            <p className="mt-2 text-3xl font-bold text-green-800">0 L</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-gray-500">Total Collections</h3>
            <p className="mt-2 text-3xl font-bold text-green-800">0</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-800">
            Welcome, Clerk!
          </h2>
          <p className="mt-2 text-gray-600">
            Use this system to register farmers and record their daily
            milk deliveries.
          </p>
        </div>
      </main>
    </div>
  );
}
