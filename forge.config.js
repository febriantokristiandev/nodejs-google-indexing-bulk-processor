module.exports = {
    packagerConfig: {
      icon: './path/to/icon', // Path to your app icon
    },
    makerConfig: {
      squirrelWindows: {
        name: "@electron-forge/maker-squirrel",
        icon: './path/to/icon.ico', // Path to your Windows icon
      },
      zip: {
        name: "@electron-forge/maker-zip",
        // Add additional zip configuration if needed
      },
    },
  };
  