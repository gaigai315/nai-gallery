import { getUser } from "../_lib/db.js";
import { getSession, json } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ user: null });
  const user = await getUser(env, session.discord_id);
  return json({ user });
}
