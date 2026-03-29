import { redirect } from "next/navigation";
import { getHomeRouteForCurrentUser, getCurrentIdentity } from "@/lib/auth";

export default async function Home() {
  const identity = await getCurrentIdentity();

  if (identity) {
    redirect(await getHomeRouteForCurrentUser());
  }

  redirect("/login");
}
