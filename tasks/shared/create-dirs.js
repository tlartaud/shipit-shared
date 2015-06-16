var utils = require('shipit-utils');
var chalk = require('chalk');
var util = require('util');
var init = require('../../lib/init');
var Bluebird = require('bluebird');
var path = require('path');

/**
 * Create required directories for linked files and dirs.
 */

module.exports = function (gruntOrShipit) {

  var task = function task() {
    var shipit = utils.getShipit(gruntOrShipit);
    shipit = init(shipit);

    var createDirs = function createDirs(paths, remote, isFile) {
      if (!paths.length) {
        return Bluebird.resolve();
      }

      isFile = isFile || false;
      var method = remote ? 'remote' : 'local';
      var pathStr = paths.map(function(filePath) {
        filePath = filePath.replace(shipit.config.shared.regex.mode,'');
        filePath = remote ? path.join(shipit.sharedPath, filePath) : filePath;
        return isFile ? util.format('$(dirname %s)', filePath) : filePath;
      }).join(' ');

      return shipit[method](
        util.format('mkdir -p %s', pathStr)
      );
    };

    shipit.log('Creating shared directories on remote.');
    return createDirs(shipit.config.shared.dirs, true, false)
    .then(createDirs(shipit.config.shared.files, true, true))
    .then(function () {
      shipit.log(chalk.green('Shared directories created on remote.'));
    })
    .then(function () {
      shipit.emit('shared:create-dirs');
    });
  };

  utils.registerTask(gruntOrShipit, 'shared:create-dirs', task);
};
