import { Disposable, workspace, TextDocument, DiagnosticCollection, Diagnostic, languages, window, QuickPickItem, ProgressLocation } from "vscode";

import BaseLinter from "./BaseLinter";
import IcarusLinter from "./IcarusLinter";
import VerilatorLinter from "./VerilatorLinter";
import XvlogLinter from "./XvlogLinter";
import ModelsimLinter from "./ModelsimLinter";

export default class LintManager {

    private subscriptions: Disposable[];

    private linter: BaseLinter;

    constructor() {
        workspace.onDidOpenTextDocument(this.lint, this, this.subscriptions);
		workspace.onDidSaveTextDocument(this.lint, this, this.subscriptions);
        workspace.onDidCloseTextDocument(this.removeFileDiagnostics, this, this.subscriptions)

        workspace.onDidChangeConfiguration(this.configLinter, this, this.subscriptions);
        this.configLinter();
    }

    configLinter() {
        let linter_name;
        linter_name = workspace.getConfiguration("verilog.linting").get<string>("linter");

        if (this.linter == null || this.linter.name != linter_name) {
            switch (linter_name) {
            case "iverilog":
                this.linter = new IcarusLinter();
                break;
            case "xvlog":
                this.linter = new XvlogLinter();
                break;
            case "modelsim":
                this.linter = new ModelsimLinter();
                break;
            case "verilator":
                this.linter = new VerilatorLinter();
                break;
            default:
                console.log("Invalid linter name.")
                this.linter = null;
                break;
            }
        }

        if (this.linter != null) {
            console.log("Using linter " + this.linter.name);
        }
    }

    lint(doc: TextDocument) {
        // Check for language id
        let lang : string = window.activeTextEditor.document.languageId;
        if(this.linter != null && window.activeTextEditor !== undefined && (lang === "verilog" || lang === "systemverilog"))
            this.linter.startLint(doc);
    }

    removeFileDiagnostics(doc: TextDocument) {
        if(this.linter != null)
            this.linter.removeFileDiagnostics(doc);
    }

    async RunLintTool() {
        // Check for language id
        let lang : string = window.activeTextEditor.document.languageId;
        if(window.activeTextEditor === undefined || (lang !== "verilog" && lang !== "systemverilog"))
            window.showErrorMessage("Verilog HDL: No document opened");
        // else if(window.activeTextEditor.document.languageId !== "verilog")
            // window.showErrorMessage("Verilog HDL: No Verilog document opened");
        else {
            // Show the available linters
            let linterStr: QuickPickItem = await window.showQuickPick([
            {   label: "iverilog",
                description: "Icarus Verilog",
            },
            {   label: "xvlog",
                description: "Vivado Logical Simulator"
            },
            {   label: "modelsim",
                description: "Modelsim"
            },
            {   label: "verilator",
                description: "Verilator"
            }],
            {   matchOnDescription: true,
                placeHolder: "Choose a linter to run",
            });
            if(linterStr === undefined)
                return;
            // Create and run the linter with progress bar
            let tempLinter: BaseLinter;
            switch(linterStr.label) {
                case "iverilog":  tempLinter = new IcarusLinter;    break;
                case "xvlog":     tempLinter = new XvlogLinter;     break;
                case "modelsim":  tempLinter = new ModelsimLinter;  break;
                case "verilator": tempLinter = new VerilatorLinter; break;
                default:
                    return;
            }
            await window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: "Verilog HDL: Running lint tool..."
                }, async (progress, token) => {
                    tempLinter.removeFileDiagnostics(window.activeTextEditor.document);
                    tempLinter.startLint(window.activeTextEditor.document);
                }
            );
        }
    }

}