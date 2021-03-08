export function puts(s: string) {
  Deno.stdout.writeSync(new TextEncoder().encode(s));
}

export async function readLine(prompt: string) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  await Deno.stdout.write(enc.encode(prompt));

  const bytes = new Uint8Array(64);
  let read = await Deno.read(Deno.stdin.rid, bytes);

  if (read) {
    const text = dec.decode(bytes.slice(0, read - 1));
    return text;
  }

  return "";
}