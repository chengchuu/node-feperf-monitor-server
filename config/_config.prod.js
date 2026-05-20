/* eslint valid-jsdoc: "off" */

"use strict";

module.exports = () => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {
    api: {
      getTokenUrl: "http://feperf.com/example",
      getTokenSk: "rabbit$",
    },
    sequelize: {
      dialect: "mysql",
      host: "localhost",
      port: 3306,
      username: "localuser",
      password: "localpassword",
      database: "feperf",
      timezone: "+08:00",
      dialectOptions: {
        charset: "utf8",
      },
    },
  };

  return {
    ...config,
  };
};
