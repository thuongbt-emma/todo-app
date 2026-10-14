/** True when the owner has turned login off entirely (AUTH_DISABLED=true). Read at call time. */
export function authDisabled(): boolean {
  return process.env.AUTH_DISABLED === 'true';
}
