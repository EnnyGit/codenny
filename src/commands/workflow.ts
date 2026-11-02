import type { Command } from "../command.js";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cmd = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const guide = `${bold("Starting the day")}
  ${cmd("ny p")}            open the project you're working on in the IDE
  ${cmd("ny p --cd")}       or only move this terminal into it
  ${cmd("ny b")}            see where every branch stands, and switch
                  ${dim("pull 3 means the server has new commits: git pull")}

${bold("Working on something")}
  ${cmd("git switch -c x")} start a branch as usual
  ${cmd("ny b")}            hop between your branches; push 2 means unpushed work

${bold("Reviewing a pull request")}
  ${cmd("ny r")}            pick the branch; it opens in its own IDE window,
                  your own folder and changes stay as they are
                  ${dim("in the IDE: branch popup > review-base > Show Diff with Working Tree")}
  ${cmd("ny r")}            next review: same folder, just pick another branch
  ${cmd("ny r --done")}     remove the review folder when you're done for a while

${bold("After pull requests are merged")}
  ${cmd("ny c")}            delete local branches that are merged and gone from the server
                  ${dim("it asks first, and keeps anything with unmerged commits")}

${bold("Your own shortcuts")}
  ${cmd("ny")}              everything you can run, including your scripts
  ${cmd("ny config")}       where your scripts folder is; any name.sh there is ny name
  ${cmd("ny <command> --help")}   the details of one command`;

export const workflow: Command = {
  name: "workflow",
  aliases: ["w"],
  summary: "how the commands fit into a normal day",
  help: "ny workflow\n\nShows how the commands fit into a normal day.",
  run() {
    console.log(guide);
  },
};
