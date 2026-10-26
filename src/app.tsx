function App() {
  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 font-bold text-cyan"
              aria-hidden="true"
            >
              K
            </div>

            <div>
              <p className="font-semibold tracking-wide">KickOff</p>
              <p className="text-xs text-muted">
                Tournament Management System
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <section
          className="w-full rounded-xl border border-border bg-panel p-6 sm:p-10"
          aria-labelledby="welcome-heading"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-cyan">
            Admin portal
          </p>

          <h1
            id="welcome-heading"
            className="mt-3 text-2xl font-bold sm:text-3xl"
          >
            KickOff Tournament Management
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-muted">
            The application foundation is in place. Tournament operations
            and administrator access will be added in later milestones.
          </p>

          <div className="mt-8 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium">Foundation status</p>
            <p className="mt-1 text-sm text-muted">
              Application shell initialized. Backend integration is not
              configured yet.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
