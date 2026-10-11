import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { account } from "./auth";
export async function requireAdmin() {
  const user = await account(await headers());
  if (!user) redirect("/connexion");
  if (!user.admin) redirect("/acces-refuse");
  return user;
}
