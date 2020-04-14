import GitConfigLocal, { GitConfig } from "gitconfiglocal";

import { URL } from "url";
import YAML from "yaml";
import fs from "fs";
import osenv from "osenv";
import path from "path";
import readline from "readline";

const configPath = path.join(osenv.home(), ".git-credential-auto-switch.yaml");

const config = fs.existsSync(configPath)
  ? YAML.parse(fs.readFileSync(configPath).toString())
  : {};

const [, , mode] = process.argv;

if (mode === "get") {
  const stdin = readline.createInterface(process.stdin);

  const lines: string[] = [];

  stdin.on("line", (data) => {
    if (lines.length < 2) {
      lines.push(data);
    } else {
      if (!data) {
        stdin.close();
      }
    }
  });

  stdin.on("close", async () => {
    try {
      const protocol = lines[0].split("=")[1];
      const host = lines[1].split("=")[1];

      const gitConfig = await new Promise<GitConfig>((resolve, reject) => {
        GitConfigLocal(process.cwd(), (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
      });

      const remotes: {
        [name: string]: {
          url: string;
          fetch: string;
        };
      } = gitConfig.remote;

      const repoRemote = Object.entries(remotes).find(([name, { url }]) => {
        const remoteURLElements = new URL(url);
        return (
          remoteURLElements.protocol === `${protocol}:` &&
          remoteURLElements.host === host
        );
      });

      const repoURL = repoRemote && repoRemote[1].url;

      if (!repoURL) {
        process.exit(1);
      }

      const { pathname } = new URL(repoURL);

      const pathElements = pathname.split("/").filter((el) => el);

      const [username] = pathElements;

      const password = config[protocol]?.[host]?.[username];

      if (password) {
        process.stdout.write(`username=${username}\n`);
        process.stdout.write(`password=${password}\n`);
      } else {
        process.exit(1);
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
} else if (mode === "store") {
  const stdin = readline.createInterface(process.stdin);

  const lines: string[] = [];

  stdin.on("line", (line) => {
    lines.push(line);
    if (lines.length === 4) {
      stdin.close();
    }
  });

  stdin.on("close", () => {
    const [protocol, host, username, password] = lines.map(
      (line) => line.split("=")[1]
    );

    if (!config[protocol]) config[protocol] = {};
    if (!config[protocol][host]) config[protocol][host] = {};

    config[protocol][host][username] = password;

    fs.writeFileSync(configPath, YAML.stringify(config));
  });
} else if (mode === "erase") {
  // ToDo: eraseを実装する
  /*
  stdin:
    protocol=https
    host=github.com
  */
}
