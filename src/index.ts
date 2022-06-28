// Import Required Dependencies
import { readFile, readdir as readDirectory, stat as getFileOrFolderStats } from 'fs/promises';
import { resolve as resolveFileOrDirectory, isAbsolute } from 'path';
import chalk from 'chalk';
import { parse } from 'yaml';
import { getGroupData } from './methods/getGroupData.js';

// Types are in index.d.ts, and they are automatically imported.

// Code
/**
 * Read the config file for this project.
 * @param {string} projectDirectory - The directory of this project.
 * @returns {ConfigFile} config - The config file is expected to be in this format.
 */
async function readConfig(projectDirectory: string): Promise<ConfigFile> {
    return new Promise(async (resolve, reject) => {
        try {
            const configFileLocation = resolveFileOrDirectory(projectDirectory, 'input/config.yml');
            const configFile = await readFile(configFileLocation, 'utf-8');
            const config: ConfigFile = parse(configFile);
            resolve(config);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Find the Google Chat Folder and turn its contents into an object.
 * @param {string} givenDirectory The directory given to this function.
 */
async function makeGoogleChatData(givenDirectory: string) {
    return new Promise<GoogleChatGroupInfo[]>(async (resolvePromise, rejectPromise) => {
        let workingDirectory: string;

        if (isAbsolute(givenDirectory)) {
            workingDirectory = givenDirectory;
        } else {
            workingDirectory = resolveFileOrDirectory(process.cwd(), givenDirectory);
        }
    
        const googleChatFolderLocation = resolveFileOrDirectory(workingDirectory, `./Google Chat`);
        const groupsFolderLocation = resolveFileOrDirectory(googleChatFolderLocation, `./Groups`);
    
        getFileOrFolderStats(googleChatFolderLocation)
            .then(async (folderStats) => {
                if (folderStats.isDirectory()) {
                    try {
                        console.log(`${chalk.green(`Found ${chalk.blue(googleChatFolderLocation)}!`)}
                        \nMaking data... This may take awhile, so please be patient!`);
                        await getFileOrFolderStats(groupsFolderLocation)
                            .then(async (groupsFolderStats) => {
                                if (groupsFolderStats.isDirectory()) {
                                    const groupList = await readDirectory(groupsFolderLocation, {});
                                    const groups: GoogleChatGroupInfo[] = [];
                                    const groupPromises = groupList.map((i) => getGroupData(groupsFolderLocation, i));
                                    for await (const i of groupPromises) {
                                        groups.push(i);
                                        console.log(`${chalk.green(`Finished making data on ${chalk.blue(i.name)}!`)}`);
                                    }
                                    console.log(`${chalk.green(`Finished making data on the following groups:\n${chalk.blue(groups.map(group => group.name).join(`\n`))}`)}`);
                                    resolvePromise(groups);
                                }
                            })
                            .catch((error) => {
                                console.log(error);
                                console.log(
                                    chalk.red(`Groups information will be excluded because it could not be found.`)
                                );
                            });
                    } catch (error) {
                        throw error;
                    }
                } else {
                    throw new Error(`Given path was not a folder!`);
                }
            })
            .catch((error) => {
                switch (true) {
                    case error.message === `Given path was not a folder!`:
                        console.error(
                            `${chalk.red(
                                `${chalk.blue(
                                    googleChatFolderLocation
                                )} was not a folder! Please check it before trying again.`
                            )}`
                        );
                        break;
                    case error.code === `ENOENT`:
                        console.error(
                            `${chalk.red(
                                `Could not find ${chalk.blue(
                                    googleChatFolderLocation
                                )}! Please make sure that this folder exists.`
                            )}`
                        );
                        break;
                    default:
                        console.error(
                            `${error}\n${chalk.red(
                                `An unknown error occured! If this is occuring repeatedly and you don't know why, please notify the developer.`
                            )}`
                        );
                }
            });
    })
}

const config = await readConfig(process.cwd());
const googleChatData = await makeGoogleChatData(config.folderLocation);