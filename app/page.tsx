import Studio from "@/components/Studio";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const query = await searchParams;
  return <Studio initialMode={query.mode === "editor" ? "editor" : "quick"} />;
}
