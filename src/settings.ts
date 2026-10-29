import { App, PluginSettingTab } from 'obsidian';
import GitAutoSyncPlugin from './main';

export class SampleSettingTab extends PluginSettingTab {
    plugin: GitAutoSyncPlugin;

    constructor(app: App, plugin: GitAutoSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Git Sync Settings' });
    }
}