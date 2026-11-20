// SPDX-License-Identifier: Apache-2.0

'use strict';
'require baseclass';
'require fs';
'require uci';

// 概览页按文件名排序装载 include，26 落在 25_storage（存储）与 29_ports（端口）之间。
// 数据与 pon/status.js 同源，走 ponctl 快照接口；该 exec 已由 luci-app-pon 的 ACL 放行。
// 线路模式/线路状态/ONU 状态与光功率共用同一次快照，不额外增加轮询开销。

function modeLabel(mode) {
	switch (mode) {
	case 'gpon': return _('GPON');
	case 'xgpon': return _('XG-PON');
	case 'xgspon': return _('XGS-PON');
	case 'epon-1g': return _('EPON 1G/1G');
	case 'epon-10g-1g': return _('10G-EPON 10G/1G');
	case 'epon-10g-10g': return _('10G-EPON 10G/10G');
	case 'none': return _('Not active');
	default: return mode || _('Not active');
	}
}

function lineModeLabel(item) {
	var line = item.line || {};
	var configured = line.configured_mode || item.section.mode || '';
	var active = line.active_mode === 'none' ? '' : line.active_mode;

	return modeLabel(active || configured);
}

function displayLifecycle(value) {
	switch (value) {
	case 'stopped': return _('Stopped');
	case 'wait-optical-signal': return _('Waiting for optical signal');
	case 'pma-configured': return _('PMA configured');
	case 'wait-line-sync': return _('Waiting for line synchronization');
	case 'protocol-activating': return _('Protocol activation in progress');
	case 'operational': return _('Operational');
	case 'error': return _('Error');
	default: return value || _('Unknown');
	}
}

function displayOnuState(value) {
	switch (value) {
	case 'O1': return _('O1 — Initial');
	case 'O2_3': return _('O2-3 — Serial number');
	case 'O4': return _('O4 — Ranging');
	case 'O5': return _('O5 — Operation');
	case 'O7': return _('O7 — Emergency stop');
	default: return value || _('Unknown');
	}
}

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

		return { section: section,
			line: snapshot.line,
			registration: snapshot.registration || {},
			frontend: snapshot.frontend || {} };
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
		// 线路快照可用就显示卡片（未配置线路、守护进程不可用时返回 null）；
		// 单字段读失败/未上报仍留在卡片里，分别显示为“读取失败”“设备未提供”。
		var usable = (lines || []).filter(function(item) {
			return !item.error;
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

			addRow(_('Line mode'), lineModeLabel(item));
			addRow(_('Line state'), displayLifecycle(item.line.lifecycle));
			addRow(_('ONU state'), displayOnuState(item.registration.onu_state));
			addRow(_('Receive optical power'), displayMetric(frontend, 'rx_power_dbm', 'dBm'));
			addRow(_('Transmit optical power'), displayMetric(frontend, 'tx_power_dbm', 'dBm'));
			addRow(_('Optical frontend temperature'), displayMetric(frontend, 'temperature_celsius', '°C'));
		});

		return table;
	}
});