// A program can't change its parent shell's folder, so the ny shell function
// hands codenny a file to write a folder to, and cds there afterwards.
import { writeFileSync } from "node:fs";

export const cdFileVar = "CODENNY_CD_FILE";

// Moves the terminal into dir once codenny exits. False when codenny wasn't
// started through the ny function, so the caller can say what to do instead.
export function cdAfterExit(dir: string): boolean {
  const file = process.env[cdFileVar];
  if (!file) return false;
  writeFileSync(file, dir.replaceAll("\\", "/"));
  return true;
}

// Works in zsh and in bash (Git Bash on Windows).
export const shellFunction = `ny() {
  local cd_file code
  cd_file=$(mktemp) || return
  ${cdFileVar}="$cd_file" codenny "$@"
  code=$?
  [ -s "$cd_file" ] && cd "$(cat "$cd_file")"
  rm -f "$cd_file"
  return $code
}
`;
