"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Farmer = {
  id: number;
  name: string;
  phone: string;
};

type Collection = {
  id: number;
  farmer_id: number;
  litres: number;
  fat_percent: number;
  collect_date: string;
};

type SortOption = "newest" | "oldest" | "most-litres" | "least-litres" | "highest-fat";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PAGE_SIZE = 5;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const [farmerName, setFarmerName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState("");
  const [litres, setLitres] = useState("");
  const [fatPercent, setFatPercent] = useState("");
  const [collectDate, setCollectDate] = useState("");

  const [farmerSearch, setFarmerSearch] = useState("");
  const [collectionSort, setCollectionSort] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewFarmer, setViewFarmer] = useState<Farmer | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const farmersResult = await supabase
      .from("farmers")
      .select("id, name, phone")
      .order("name", { ascending: true });

    if (farmersResult.error) {
      setError("Could not load farmers: " + farmersResult.error.message);
      setLoading(false);
      return;
    }

    setFarmers(farmersResult.data || []);

    const collectionsResult = await supabase
      .from("collections")
      .select("id, farmer_id, litres, fat_percent, collect_date")
      .order("collect_date", { ascending: false })
      .order("id", { ascending: false });

    if (collectionsResult.error) {
      setError("Could not load collections: " + collectionsResult.error.message);
    } else {
      setCollections(collectionsResult.data || []);
    }

    setLoading(false);
  }

  // Set the date after the page loads in the browser.
  useEffect(() => {
    setCollectDate(today());
  }, []);

  // Check whether a clerk is signed in.
  useEffect(() => {
    let mounted = true;

    async function checkLogin() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = data.session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadData();
      } else {
        setLoading(false);
      }

      setAuthLoading(false);
    }

    void checkLogin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setFarmers([]);
        setCollections([]);
        setViewFarmer(null);
        setLoading(false);
      } else {
        void loadData();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Login failed: " + error.message);
      setAuthLoading(false);
    } else {
      setPassword("");
      setSuccess("You have signed in successfully.");
      setAuthLoading(false);
    }
  }

  async function signup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    setAuthLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Account creation failed: " + error.message);
    } else {
      setPassword("");
      if (data.session) {
        setSuccess("Your account has been created. You are now signed in.");
      } else {
        setSuccess("Account created. Check your email for a confirmation link, then return here to sign in.");
        setAuthMode("login");
      }
    }

    setAuthLoading(false);
  }

  async function logout() {
    setError("");
    setSuccess("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError("Could not log out: " + error.message);
    } else {
      setSuccess("You have logged out.");
    }
  }

  async function registerFarmer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!farmerName.trim() || !phone.trim()) {
      setError("Please enter the farmer's name and phone number.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("farmers")
      .insert({
        name: farmerName.trim(),
        phone: phone.trim(),
      })
      .select("id, name, phone")
      .single();

    if (error) {
      setError("Could not register farmer: " + error.message);
    } else if (data) {
      setFarmers((old) => [...old, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFarmerName("");
      setPhone("");
      setSuccess("Farmer registered successfully.");
    }

    setSaving(false);
  }

  async function recordCollection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(litres);
    const fat = Number(fatPercent);

    if (!selectedFarmer) {
      setError("Please select a farmer.");
      return;
    }

    if (!litres || !Number.isFinite(amount) || amount <= 0 || amount > 100) {
      setError("Litres must be greater than 0 and not more than 100.");
      return;
    }

    if (!fatPercent || !Number.isFinite(fat) || fat < 0 || fat > 100) {
      setError("Fat percentage must be between 0 and 100.");
      return;
    }

    if (!collectDate) {
      setError("Please select a collection date.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("collections")
      .insert({
        farmer_id: Number(selectedFarmer),
        litres: amount,
        fat_percent: fat,
        collect_date: collectDate,
      })
      .select("id, farmer_id, litres, fat_percent, collect_date")
      .single();

    if (error) {
      setError("Could not save collection: " + error.message);
    } else if (data) {
      setCollections((old) => [data, ...old]);
      setSelectedFarmer("");
      setLitres("");
      setFatPercent("");
      setCollectDate(today());
      setSuccess("Milk collection saved successfully.");
    }

    setSaving(false);
  }

  // Search farmers by name or phone number.
  const filteredFarmers = useMemo(() => {
    const search = farmerSearch.toLowerCase().trim();

    return farmers.filter(
      (farmer) =>
        farmer.name.toLowerCase().includes(search) ||
        farmer.phone.toLowerCase().includes(search)
    );
  }, [farmers, farmerSearch]);

  // Sort the collection records.
  const sortedCollections = useMemo(() => {
    const result = [...collections];

    switch (collectionSort) {
      case "oldest":
        return result.sort(
          (a, b) =>
            a.collect_date.localeCompare(b.collect_date) || a.id - b.id
        );
      case "most-litres":
        return result.sort((a, b) => Number(b.litres) - Number(a.litres));
      case "least-litres":
        return result.sort((a, b) => Number(a.litres) - Number(b.litres));
      case "highest-fat":
        return result.sort(
          (a, b) => Number(b.fat_percent) - Number(a.fat_percent)
        );
      case "newest":
      default:
        return result.sort(
          (a, b) =>
            b.collect_date.localeCompare(a.collect_date) || b.id - a.id
        );
    }
  }, [collections, collectionSort]);

  const totalPages = Math.max(1, Math.ceil(sortedCollections.length / PAGE_SIZE));

  const paginatedCollections = sortedCollections.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const todayTotal = collections
    .filter((c) => c.collect_date === today())
    .reduce((sum, c) => sum + Number(c.litres), 0);

  const totalLitres = collections.reduce(
    (sum, c) => sum + Number(c.litres),
    0
  );

  const farmerCollections = viewFarmer
    ? collections.filter((c) => c.farmer_id === viewFarmer.id)
    : [];

  // Show a loading screen while checking the login.
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-900 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">Checking your account...</p>
        </div>
      </main>
    );
  }

  // LOGIN PAGE
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-blue-950 text-white p-8 text-center">
            <div className="text-5xl mb-3"></div>
            <h1 className="text-3xl font-bold">DairyTrack</h1>
            <p className="text-blue-100 mt-2">
              Rwanda Milk Collection Management
            </p>
          </div>

          <form onSubmit={authMode === "login" ? login : signup} className="p-8 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {authMode === "login" ? "Clerk Login" : "Create Your Account"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {authMode === "login"
                  ? "Sign in to manage farmers and milk collections."
                  : "Create an account to access DairyTrack."}
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">
                Email address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Password
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-blue-950 p-3 text-white font-bold hover:bg-blue-900 disabled:opacity-50"
            >
              {authLoading
                ? (authMode === "login" ? "Signing in..." : "Creating account...")
                : (authMode === "login" ? "Sign In" : "Create Account")}
            </button>

            <p className="text-sm text-center text-slate-600">
              {authMode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setError("");
                  setSuccess("");
                }}
                className="font-bold text-blue-900 underline"
              >
                {authMode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>

            <p className="text-xs text-slate-500 text-center">
              Use an email address you can access. If email confirmation is enabled in Supabase, confirm your email before signing in.
            </p>
          </form>
        </div>
      </main>
    );
  }

  // MAIN DASHBOARD
  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">

      {/* NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-950 text-white rounded-xl p-3 text-2xl">
              
            </div>
            <div>
              <h1 className="font-bold text-xl text-blue-950">DairyTrack</h1>
              <p className="text-xs text-slate-500">
                Rwanda Milk Collection Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-600">
              {user.email}
            </span>
            <button
              onClick={logout}
              className="rounded-xl bg-blue-950 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-900"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-5 py-8">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl bg-blue-950 text-white mb-10 min-h-[360px] flex items-center">
          <img
            src="https://commons.wikimedia.org/wiki/Special:FilePath/Gukama_inka.jpg"
            alt="Traditional cow milking in Rwanda"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-950/65 to-transparent" />
          <div className="relative z-10 p-8 md:p-14 max-w-3xl">
            <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm">
              Rwanda • Dairy Agriculture
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mt-4 leading-tight">
              Milk Collection Centre Tracker
            </h2>
            <p className="mt-5 text-blue-50 text-lg">
              Manage farmers, record daily milk deliveries and monitor
              collection activities in one place.
            </p>
            <a
              href="#record"
              className="inline-block mt-7 rounded-xl bg-white text-blue-950 font-bold px-6 py-3 hover:bg-blue-50"
            >
              Record Milk Collection →
            </a>
          </div>
        </section>

        {/* ALERTS */}
        {error && (
          <div role="alert" className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-5 rounded-xl bg-green-50 border border-green-200 p-4 text-green-800">
            ✓ {success}
          </div>
        )}

        {/* DASHBOARD CARDS */}
        <section className="mb-10">
          <div className="mb-6">
            <p className="text-blue-800 font-semibold text-sm uppercase tracking-wider">
              Overview
            </p>
            <h2 className="text-2xl font-bold text-blue-950 mt-1">
              Dashboard
            </h2>
            <p className="text-slate-500 mt-1">
              Monitor your collection centre activities.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <p className="text-slate-500 font-medium">Total Farmers</p>
              <p className="text-4xl font-bold mt-4 text-blue-950">{farmers.length}</p>
              <p className="text-sm text-slate-400 mt-2">Registered suppliers</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <p className="text-slate-500 font-medium">Milk Collected Today</p>
              <p className="text-4xl font-bold mt-4 text-blue-950">{todayTotal.toFixed(2)} L</p>
              <p className="text-sm text-slate-400 mt-2">Today's milk volume</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <p className="text-slate-500 font-medium">Total Collections</p>
              <p className="text-4xl font-bold mt-4 text-blue-950">{collections.length}</p>
              <p className="text-sm text-slate-400 mt-2">Recorded deliveries</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <p className="text-slate-500 font-medium">Total Milk Volume</p>
              <p className="text-4xl font-bold mt-4 text-blue-950">{totalLitres.toFixed(2)} L</p>
              <p className="text-sm text-slate-400 mt-2">All recorded milk</p>
            </div>
          </div>
        </section>

        {/* FORMS */}
        <section className="grid lg:grid-cols-2 gap-6 mb-10">

          {/* REGISTER FARMER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-6">
              <span className="text-3xl"></span>
              <h2 className="text-xl font-bold mt-3 text-blue-950">
                Register a Farmer
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Add a new milk supplier to your centre.
              </p>
            </div>

            <form onSubmit={registerFarmer} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Farmer Name</label>
                <input
                  required
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="Enter farmer name"
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <button
                disabled={saving}
                className="w-full rounded-xl bg-blue-950 p-3 text-white font-bold hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? "Saving..." : "+ Register Farmer"}
              </button>
            </form>
          </div>

          {/* RECORD COLLECTION */}
          <div id="record" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-6">
              <span className="text-3xl"></span>
              <h2 className="text-xl font-bold mt-3 text-blue-950">
                Record Milk Collection
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Record a farmer's daily milk delivery.
              </p>
            </div>

            <form onSubmit={recordCollection} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Select Farmer</label>
                <select
                  required
                  value={selectedFarmer}
                  onChange={(e) => setSelectedFarmer(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 bg-white"
                >
                  <option value="">Choose a farmer</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} - {f.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">Litres</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={litres}
                    onChange={(e) => setLitres(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full rounded-xl border border-slate-300 p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Fat %</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={fatPercent}
                    onChange={(e) => setFatPercent(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full rounded-xl border border-slate-300 p-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Collection Date</label>
                <input
                  required
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              <button
                disabled={saving || loading || farmers.length === 0}
                className="w-full rounded-xl bg-blue-950 p-3 text-white font-bold hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Milk Collection"}
              </button>

              {farmers.length === 0 && !loading && (
                <p className="text-sm text-amber-700">
                  Register a farmer before recording a milk collection.
                </p>
              )}
            </form>
          </div>
        </section>

        {/* FARMERS TABLE WITH SEARCH AND DETAILS */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-blue-950">Registered Farmers</h2>
            <p className="text-sm text-slate-500 mt-1">Search and view your milk suppliers.</p>

            <input
              type="search"
              value={farmerSearch}
              onChange={(e) => setFarmerSearch(e.target.value)}
              placeholder="Search by farmer name or phone..."
              className="mt-4 w-full md:max-w-md rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-100 border-t-blue-900 mx-auto mb-3" />
              Loading farmers...
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-slate-700">
                {farmers.length === 0 ? "No farmers registered yet." : "No farmers match your search."}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {farmers.length === 0 ? "Use the form above to register your first farmer." : "Try another name or phone number."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-sm">
                  <tr>
                    <th className="p-4">Farmer Name</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.map((f) => (
                    <tr key={f.id} className="border-t border-slate-100 hover:bg-blue-50">
                      <td className="p-4 font-medium">{f.name}</td>
                      <td className="p-4 whitespace-nowrap">{f.phone}</td>
                      <td className="p-4">
                        <button
                          onClick={() => setViewFarmer(f)}
                          className="rounded-lg bg-blue-50 text-blue-900 px-3 py-2 text-sm font-semibold hover:bg-blue-100"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FARMER DETAILS */}
        {viewFarmer && (
          <section className="bg-white rounded-2xl border border-blue-200 shadow-sm mb-8 overflow-hidden">
            <div className="p-6 bg-blue-950 text-white flex flex-wrap justify-between items-center gap-3">
              <div>
                <p className="text-blue-200 text-sm">Farmer details</p>
                <h2 className="text-2xl font-bold">{viewFarmer.name}</h2>
              </div>
              <button
                onClick={() => setViewFarmer(null)}
                className="rounded-lg bg-white text-blue-950 px-4 py-2 text-sm font-semibold"
              >
                Close details
              </button>
            </div>

            <div className="p-6 grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Farmer ID</p>
                <p className="font-bold text-lg">{viewFarmer.id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Phone number</p>
                <p className="font-bold text-lg">{viewFarmer.phone}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total deliveries</p>
                <p className="font-bold text-lg">{farmerCollections.length}</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <h3 className="font-bold text-blue-950 mb-3">Milk delivery history</h3>
              {farmerCollections.length === 0 ? (
                <p className="text-sm text-slate-500">
                  This farmer has no milk collection records yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Litres</th>
                        <th className="p-3">Fat %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerCollections.map((c) => (
                        <tr key={c.id} className="border-t border-slate-100">
                          <td className="p-3">{c.collect_date}</td>
                          <td className="p-3">{Number(c.litres).toFixed(2)} L</td>
                          <td className="p-3">{Number(c.fat_percent).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* COLLECTION TABLE WITH SORTING AND PAGINATION */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-10 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-end gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-950">Milk Collection Records</h2>
              <p className="text-sm text-slate-500 mt-1">Sort and browse daily delivery history.</p>
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-sm font-semibold mb-2">Sort records</label>
              <select
                value={collectionSort}
                onChange={(e) => {
                  setCollectionSort(e.target.value as SortOption);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-56 rounded-xl border border-slate-300 p-3 bg-white"
              >
                <option value="newest">Newest date first</option>
                <option value="oldest">Oldest date first</option>
                <option value="most-litres">Most litres first</option>
                <option value="least-litres">Least litres first</option>
                <option value="highest-fat">Highest fat percentage</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-100 border-t-blue-900 mx-auto mb-3" />
              Loading collection records...
            </div>
          ) : sortedCollections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-slate-700">No milk collections recorded yet.</p>
              <p className="text-sm text-slate-500 mt-1">
                Use the collection form above to record a delivery.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 text-sm">
                    <tr>
                      <th className="p-4">Farmer</th>
                      <th className="p-4">Litres</th>
                      <th className="p-4">Fat %</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCollections.map((c) => {
                      const farmer = farmers.find((f) => f.id === c.farmer_id);

                      return (
                        <tr key={c.id} className="border-t border-slate-100 hover:bg-blue-50">
                          <td className="p-4 font-medium">
                            {farmer?.name || "Unknown farmer"}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {Number(c.litres).toFixed(2)} L
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {Number(c.fat_percent).toFixed(2)}%
                          </td>
                          <td className="p-4 whitespace-nowrap">{c.collect_date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="p-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, sortedCollections.length)} of{" "}
                  {sortedCollections.length} records
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>

                  <span className="text-sm font-semibold text-blue-950">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* RWANDAN DAIRY PHOTOS */}
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-wider text-blue-800 font-semibold">
              Our dairy community
            </p>
            <h2 className="text-2xl font-bold text-blue-950 mt-1">
              Supporting Rwanda's Dairy Farmers
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
              <img
                src="https://commons.wikimedia.org/wiki/Special:FilePath/Gukama_inka.jpg"
                alt="Traditional cow milking in Rwanda"
                className="w-full h-64 object-cover"
              />
              <div className="p-5">
                <h3 className="font-bold text-lg text-blue-950">Traditional Dairy Farming</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Supporting farmers and improving milk collection practices.
                </p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
              <img
                src="https://commons.wikimedia.org/wiki/Special:FilePath/Kubuganiza_amata.jpg"
                alt="Traditional milk preparation in Rwanda"
                className="w-full h-64 object-cover"
              />
              <div className="p-5">
                <h3 className="font-bold text-lg text-blue-950">Milk Quality and Preparation</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Keeping milk records organized and supporting quality dairy products.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            
            {" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Gukama_inka.jpg"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              
            </a>
            {" · "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Kubuganiza_amata.jpg"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              
            </a>
          </p>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-blue-950 text-white mt-12">
        <div className="max-w-7xl mx-auto px-5 py-10">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold">DairyTrack</h2>
              <p className="text-blue-200 mt-3 max-w-md">
                Milk Collection Centre Tracker — a digital solution for
                managing farmers and daily milk deliveries in Rwanda.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">Student Information</h3>
              <p className="text-blue-100">Name: Gisubizo Sandrine</p>
              <p className="text-blue-100">Registration Number: 223020183</p>
              <p className="text-blue-100">School of Business</p>
              <p className="text-blue-100">
                Department of Business and Information Technology
              </p>
            </div>
          </div>

          <div className="border-t border-blue-800 mt-8 pt-5 text-center text-sm text-blue-200">
            © 2026 Milk Collection Centre Tracker. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}