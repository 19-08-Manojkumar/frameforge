"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-error">
      <h1>Let’s give that another try.</h1>
      <p>The studio encountered a problem. Reload the workspace to continue.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <p>
        Your saved draft stays on this device. Reopen the editor to recover it.
      </p>
    </main>
  );
}
