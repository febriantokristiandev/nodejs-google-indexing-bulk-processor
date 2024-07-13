module.exports = {
    packagerConfig: {
        icon: './img/icon.ico',
    },
    makerConfig: {
        squirrelWindows: {
            name: "@electron-forge/maker-squirrel",
            icon: './img/icon.ico', 
        },
        zip: {
            name: "@electron-forge/maker-zip",
            icon: './img/icon.ico',
        },
    },
};
  