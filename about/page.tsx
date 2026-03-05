import UserNav from "@/components/user-nav";

export default function AboutPage() {
  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6 md:p-8">
          <p className="eyebrow">About Lyric Atlas</p>
          <h1 className="display-title mt-3">A modern lyrics hub built for rapid music discovery.</h1>
          <p className="body-copy mt-3 max-w-3xl">
            Lyric Atlas organizes songs, artists, and lyrics into a fast path: search instantly, open full details, and move through connected music pages.
          </p>
          <p className="body-copy mt-3 max-w-3xl">
            The site is powered by Next.js and Supabase, with an admin dashboard for content management and a public request flow for new songs.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <article className="card rounded-2xl p-4">
              <p className="eyebrow">Product Goal</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Make lyric search and navigation clear on both desktop and mobile.</p>
            </article>
            <article className="card rounded-2xl p-4">
              <p className="eyebrow">Content Flow</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Artists and songs are linked so users can move between pages quickly.</p>
            </article>
            <article className="card rounded-2xl p-4">
              <p className="eyebrow">Maintenance</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Admin tools allow structured updates without direct database edits.</p>
            </article>
          </div>

          <div className="card mt-7 rounded-2xl p-5 md:max-w-md">
            <p className="eyebrow">Builder</p>
            <p className="mt-1 text-xl font-semibold">Kaung Khant Ko</p>
            <a
              href="https://www.linkedin.com/in/kaungkhantko06"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary mt-3"
            >
              Visit LinkedIn
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
