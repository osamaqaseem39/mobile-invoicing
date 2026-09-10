import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || !session.apiAccessToken) {
    // ?expired=1 tells the proxy this session is unusable, so it renders the
    // sign-in page instead of bouncing back here on the strength of the cookie.
    redirect("/login?expired=1");
  }
  return { ...session.user, apiToken: session.apiAccessToken };
}
