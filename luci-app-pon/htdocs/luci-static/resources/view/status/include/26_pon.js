// SPDX-License-Identifier: Apache-2.0

'use strict';
'require baseclass';
'require fs';
'require uci';

// 概览页按文件名排序装载 include，26 落在 25_storage（存储）与 29_ports（端口）之间。
// 数据与 pon/status.js 同源，走 ponctl 快照接口；该 exec 已由 luci-app-pon 的 ACL 放行。

function displayMetric(frontend, field, unit) {
	if (frontend.error)
		return _('Read failed');
	if (!Object.prototype.hasOwnProperty.call(frontend, field))
		return _('Not supported');
	return Number(frontend[field]).toFixed(2) + ' ' + unit;
}

function loadLine(section) {
	var device = section.device || '';

	if (!device)
		return Promise.resolve({ section: section, error: _('No device configured') });

	return L.resolveDefault(fs.exec_direct('/usr/sbin/ponctl',
		[ '--device', device, 'status', '--json' ]), null).then(function(output) {
		var snapshot;

		try {
			snapshot = JSON.parse(output);
			if (snapshot.schema_version !== 1 || !snapshot.line)
				throw new Error('status schema');
		}
		catch (e) {
			return { section: section,
				error: output == null ? _('Device unavailable') : _('Invalid status response') };
		}

		return { section: section, frontend: snapshot.frontend || {} };
	});
}

return baseclass.extend({
	title: _('Optical module'),

	load: function() {
		return uci.load('pon').then(function() {
			return Promise.all(uci.sections('pon', 'xpon').map(loadLine));
		});
	},

	render: function(lines) {
		// 没有可读的光模块快照（未配置线路、守护进程不可用或前端驱动缺失）时返回 null，
		// 概览页不会出现空卡片；单个字段读失败仍留在卡片里显示为“读取失败”。
		var usable = (lines || []).filter(function(item) {
			return !item.error && item.frontend &&
				Object.keys(item.frontend).length > 0;
		});

		if (!usable.length)
			return null;

		var multi = usable.length > 1;
		var table = E('table', { 'class': 'table' });

		usable.forEach(function(item) {
			var frontend = item.frontend;

			function addRow(text, value) {
				table.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td left', 'width': '33%' }, [
						multi ? '%s — %s'.format(item.section['.name'], text) : text
					]),
					E('td', { 'class': 'td left' }, [ value ])
				]));
			}

			addRow(_('Receive optical power'), displayMetric(frontend, 'rx_power_dbm', 'dBm'));
			addRow(_('Transmit optical power'), displayMetric(frontend, 'tx_power_dbm', 'dBm'));
			addRow(_('Optical frontend temperature'), displayMetric(frontend, 'temperature_celsius', '°C'));
		});

		return table;
	}
});