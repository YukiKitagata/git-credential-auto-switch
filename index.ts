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

const getRepoURL = async (
  protocol: string,
  host: string
): Promise<string | undefined> => {
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

  return repoURL;
};

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
      const data: {
        [key: string]: string;
      } = {};

      lines.forEach((line) => {
        const [key, value] = line.split("=");
        data[key] = value;
      });

      const { protocol, host } = data;

      const repoURL = await getRepoURL(protocol, host);

      if (!repoURL) {
        process.exit(1);
      }

      const { pathname } = new URL(repoURL);

      const pathElements = pathname.split("/").filter((el) => el);

      const [usernameOrOrgName] = pathElements;

      const { username, password } =
        config[protocol]?.[host]?.[usernameOrOrgName] || {};

      if (!password) {
        process.exit(1);
      }

      if (password) {
        process.stdout.write(`username=${username}\n`);
        process.stdout.write(`password=${password}\n`);
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

  stdin.on("close", async () => {
    try {
      const data: {
        [key: string]: string;
      } = {};

      lines.forEach((line) => {
        const [key, value] = line.split("=");
        data[key] = value;
      });

      const { protocol, host, username, password } = data;

      const repoURL = await getRepoURL(protocol, host);

      if (!repoURL) {
        process.exit(1);
      }
      const { pathname } = new URL(repoURL);

      const pathElements = pathname.split("/").filter((el) => el);

      const [usernameOrOrgName] = pathElements;

      if (!config[protocol]) config[protocol] = {};
      if (!config[protocol][host]) config[protocol][host] = {};
      if (!config[protocol][host][usernameOrOrgName])
        config[protocol][host][usernameOrOrgName] = {};

      if (password)
        config[protocol][host][usernameOrOrgName] = { password, username };

      fs.writeFileSync(configPath, YAML.stringify(config));
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
} else if (mode === "erase") {
  // ToDo: eraseを実装する
  /*
  stdin:
    protocol=https
    host=github.com
  */
}
