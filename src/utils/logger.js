const chalk = require('chalk');
const { DateTime } = require("luxon");
const axios = require("axios");
const semver = require("semver");

async function printBanner() {
  const projectVersion = require("../../package.json").version;
  console.clear();
  console.log(
    chalk.cyanBright(`

██████╗░░█████╗░████████╗  ██████╗░██████╗░░█████╗░░██████╗░░█████╗░███╗░░██╗███████╗
██╔══██╗██╔══██╗╚══██╔══╝  ██╔══██╗██╔══██╗██╔══██╗██╔════╝░██╔══██╗████╗░██║╚════██║
██████╦╝██║░░██║░░░██║░░░  ██║░░██║██████╔╝███████║██║░░██╗░██║░░██║██╔██╗██║░░░░██╔╝
██╔══██╗██║░░██║░░░██║░░░  ██║░░██║██╔══██╗██╔══██║██║░░╚██╗██║░░██║██║╚████║░░░██╔╝░
██████╦╝╚█████╔╝░░░██║░░░  ██████╔╝██║░░██║██║░░██║╚██████╔╝╚█████╔╝██║░╚███║░░██╔╝░░
╚═════╝░░╚════╝░░░░╚═╝░░░  ╚═════╝░╚═╝░░╚═╝╚═╝░░╚═╝░╚═════╝░░╚════╝░╚═╝░░╚══╝░░╚═╝░░░
`)
  );

  console.log(chalk.gray("═══════════════════════════════════════════════════════════════════"));
  console.log("» " + chalk.green("Version: ") + chalk.white(projectVersion));
  console.log("» " + chalk.green("Author : ") + chalk.white("Jukaza208, Soulmate"));
  console.log("» " + chalk.green("Github : ") + chalk.underline("https://github.com/jukaza/bot_zalo_dragon7super"));
  console.log(chalk.gray("═══════════════════════════════════════════════════════════════════\n"));

  // Check for updates
  try {
    const response = await axios.get("https://api.github.com/repos/jukaza/bot_zalo_dragon7super/releases/latest", {
      timeout: 5000
    });
    const latestVersion = response.data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present

    if (semver.gt(latestVersion, projectVersion)) {
      log("New version available: " + latestVersion + " (current: " + projectVersion + ")\n", "warn");
    }
  } catch (error) {
    // Silently fail if we can't check for updates (network issues, etc.)
    // Don't spam the console with error messages
  }
}

function getTimestamp() {
  const now = DateTime.now().setZone('Asia/Ho_Chi_Minh');
  return `[${now.toFormat("HH:mm:ss")}]`;
}

function log(data, option) {
    const time = getTimestamp();
    switch (option) {
        case "warn":
            console.log(chalk.bold.hex("#FFD700")(time +' » ') + data);
            break;
        case "error":
            console.log(chalk.bold.hex("#FF0000")(time +' » ') + data);
            break;
        case "info":
            console.log(chalk.bold.hex("#00BFFF")(time +' » ') + data);
            break;
        default:
          console.log(chalk.bold.hex("#00BFFF")(data));
    }
}

module.exports = {
    log,
    printBanner
};
