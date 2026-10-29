import { App, Plugin, Notice, Modal, Setting } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default class GitAutoSyncPlugin extends Plugin {
    getVaultPath(): string {
        //@ts-ignore
        return this.app.vault.adapter.basePath;
    }

    async onload() {
        //@ts-ignore
        this.app.workspace.onLayoutReady(() => {
            this.runGitPull(true);
        });

        const statusBarItem = this.addStatusBarItem();
        statusBarItem.setText('Git Sync');
        statusBarItem.addClass('mod-clickable');
        statusBarItem.addEventListener('click', () => {
            new SyncActionModal(this.app, 
                () => this.runGitPull(false), 
                () => this.handleSyncClick()
            ).open();
        });

        this.addCommand({
            id: 'git-sync-pull',
            name: 'Pull Changes',
            callback: () => {
                this.runGitPull(false);
            }
        });

        this.addCommand({
            id: 'git-sync-commit-push',
            name: 'Commit and Push Changes',
            callback: () => {
                this.handleSyncClick();
            }
        });
    }

    async runCommand(command: string): Promise<string> {
        const vaultPath = this.getVaultPath();
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: vaultPath });
            return stdout || stderr;
        } catch (error: any) {
            throw new Error(error.message || 'Git Sync: Err');
        }
    }

    async runGitPull(silent: boolean = false) {
        try {
            if (!silent) new Notice('Git Sync: Pull');
            await this.runCommand('git pull');
            if (!silent) new Notice('Git Sync: Pull Ok');
        } catch (error: any) {
            console.error(error);
            new Notice('Git Sync: Err: Pull ' + error.message);
        }
    }

    async handleSyncClick() {
        new CommitMessageModal(this.app, async (customMessage) => {
            try {
                new Notice('Git Sync: Add');
                await this.runCommand('git add .');

                const message = customMessage.trim() !== '' 
                    ? customMessage 
                    : `Otomatik Sync: ${new Date().toLocaleString('tr-TR')}`;

                new Notice('Git Sync: Commit');
                await this.runCommand(`git commit -m "${message}"`);

                new Notice('Git Sync: Push');
                await this.runCommand('git push');

                new Notice('Git Sync: Ok');
            } catch (error: any) {
                console.error(error);
                new Notice('Git Sync: Err: Push ' + error.message);
            }
        }).open();
    }

    onunload() {}
}

class SyncActionModal extends Modal {
    onPull: () => void;
    onCommitPush: () => void;

    constructor(app: App, onPull: () => void, onCommitPush: () => void) {
        super(app);
        this.onPull = onPull;
        this.onCommitPush = onCommitPush;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: 'Git Sync İşlemi Seçin' });

        new Setting(contentEl)
            .setName('Manuel Pull')
            .setDesc('Uzaktaki değişiklikleri kasaya çeker.')
            .addButton((btn) =>
                btn
                    .setButtonText('Pull Yap')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onPull();
                    })
            );

        new Setting(contentEl)
            .setName('Commit & Push')
            .setDesc('Değişiklikleri kaydeder ve uzaya gönderir.')
            .addButton((btn) =>
                btn
                    .setButtonText('Commit-Push')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onCommitPush();
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class CommitMessageModal extends Modal {
    onSubmit: (result: string) => void;
    message: string = '';

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: 'Commit Message' });

        new Setting(contentEl)
            .setName('Commit Message')
            .setDesc('Default: date/time stamp')
            .addText((text) => {
                text.setPlaceholder('Example: "Updated notes"')
                    .onChange((value) => {
                        this.message = value;
                    });
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.close();
                        this.onSubmit(this.message);
                    }
                });
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Commit-Push')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.message);
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}