const path = require("path");
const fs = require("fs");

const databasePath = path.resolve(__dirname, "..", "..", "database");

const INACTIVE_GROUPS_FILE = "inactive-groups";
const ANTI_LINK_GROUPS_FILE = "anti-link-groups";
const WELCOME_GROUPS_FILE = "welcome-groups";

// Crear las carpetas necesarias si no existen
function createIfNotExists(fullPath) {
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true }); // Crear las carpetas necesarias
    }
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, JSON.stringify({})); // Crear archivo vacío si no existe
    }
}

// Leer un archivo JSON
function readJSON(jsonFile) {
    const fullPath = path.resolve(databasePath, `${jsonFile}.json`);
    createIfNotExists(fullPath);
    try {
        return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (err) {
        console.error(`Error al leer el archivo ${jsonFile}:`, err);
        return {}; // Retornar un objeto vacío en caso de error
    }
}

// Escribir datos en un archivo JSON
function writeJSON(jsonFile, data) {
    const fullPath = path.resolve(databasePath, `${jsonFile}.json`);
    createIfNotExists(fullPath);
    try {
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error al escribir en el archivo ${jsonFile}:`, err);
    }
}

// Manejo del estado general de los grupos
exports.activateGroup = (groupId) => {
    const inactiveGroups = readJSON(INACTIVE_GROUPS_FILE);
    const index = inactiveGroups.indexOf(groupId);
    if (index !== -1) {
        inactiveGroups.splice(index, 1);
        writeJSON(INACTIVE_GROUPS_FILE, inactiveGroups);
    }
};

exports.deactivateGroup = (groupId) => {
    const inactiveGroups = readJSON(INACTIVE_GROUPS_FILE);
    if (!inactiveGroups.includes(groupId)) {
        inactiveGroups.push(groupId);
        writeJSON(INACTIVE_GROUPS_FILE, inactiveGroups);
    }
};

exports.isActiveGroup = (groupId) => {
    const inactiveGroups = readJSON(INACTIVE_GROUPS_FILE);
    return !inactiveGroups.includes(groupId);
};

// Manejo de la configuración de bienvenida
exports.activateWelcomeGroup = (groupId) => {
    const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
    welcomeGroups[groupId] = { enabled: true, mode: "1" };
    writeJSON(WELCOME_GROUPS_FILE, welcomeGroups);
};

exports.deactivateWelcomeGroup = (groupId) => {
    const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
    delete welcomeGroups[groupId];
    writeJSON(WELCOME_GROUPS_FILE, welcomeGroups);
};

exports.setWelcomeMode = (groupId, mode) => {
    const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
    if (welcomeGroups[groupId]) {
        welcomeGroups[groupId].mode = mode;
        writeJSON(WELCOME_GROUPS_FILE, welcomeGroups);
    }
};

exports.getWelcomeMode = (groupId) => {
    const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
    return welcomeGroups[groupId] ? welcomeGroups[groupId].mode : null;
};

exports.isActiveWelcomeGroup = (groupId) => {
    const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
    return welcomeGroups[groupId] && welcomeGroups[groupId].enabled;
};

// Manejo del anti-link
exports.activateAntiLinkGroup = (groupId, mode = "1") => {
    const filename = ANTI_LINK_GROUPS_FILE;
    const antiLinkGroups = readJSON(filename);
    antiLinkGroups[groupId] = { enabled: true, mode };
    writeJSON(filename, antiLinkGroups);
};

exports.deactivateAntiLinkGroup = (groupId) => {
    const filename = ANTI_LINK_GROUPS_FILE;
    const antiLinkGroups = readJSON(filename);
    delete antiLinkGroups[groupId];
    writeJSON(filename, antiLinkGroups);
};

exports.setAntiLinkMode = (groupId, mode) => {
    const filename = ANTI_LINK_GROUPS_FILE;
    const antiLinkGroups = readJSON(filename);
    if (antiLinkGroups[groupId]) {
        antiLinkGroups[groupId].mode = mode;
        writeJSON(filename, antiLinkGroups);
    }
};

exports.getAntiLinkMode = (groupId) => {
    const filename = ANTI_LINK_GROUPS_FILE;
    const antiLinkGroups = readJSON(filename);
    return antiLinkGroups[groupId] ? antiLinkGroups[groupId].mode : null;
};

exports.isActiveAntiLinkGroup = (groupId) => {
    const filename = ANTI_LINK_GROUPS_FILE;
    const antiLinkGroups = readJSON(filename);
    return antiLinkGroups[groupId] && antiLinkGroups[groupId].enabled;
};