import UserNav from "@/components/user-nav";

export default function AboutPage() {
  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6">
          <h1 className="text-3xl font-semibold leading-tight">About Website</h1>
          <p className="mt-2 text-sm text-[#4e4537]">
            Hexora is a lyrics platform focused on making songs easier to discover, organize, and
            read in one place.
          </p>
          <p className="mt-4 text-sm text-[#4e4537]">
            Goal: build a clean and simple space where people can search songs, explore artists, and
            quickly open song lyrics.
          </p>

          <div className="mt-6 rounded-2xl border border-[#d7c9b2] bg-[#fffcf6] p-4">
            <p className="mono text-xs uppercase tracking-widest text-[#685d4d]">Builder</p>
            <p className="mt-1 text-lg font-semibold">Kaung Khant Ko</p>
            <a
              href="https://www.linkedin.com/in/kaungkhantko06"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d7c9b2] bg-white px-3 py-2 text-sm font-medium text-[#4e4537] transition hover:bg-[#f4ecdf]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
              >
                <path d="M4.98 3.5A2.48 2.48 0 1 0 5 8.46 2.48 2.48 0 0 0 4.98 3.5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.05 21 14.2V21h-4v-5.98c0-1.43-.02-3.27-1.99-3.27-2 0-2.3 1.56-2.3 3.17V21H9z" />
              </svg>
              LinkedIn
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
