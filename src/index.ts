import "./styles/main.scss";
import {PlayerCharacterSheet} from "./module/sheets/PlayerCharacterSheet";
import {DiceRoller} from "./module/dice/DiceRoller";

Hooks.once("init", async () => {
    console.log("Custom System | Initialisation");

    // Initialize the dice roller
    DiceRoller.init();

    // Register custom sheets
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("fvtt-mds", PlayerCharacterSheet, {
        types: ["playerCharacter"],
        makeDefault: true
    });

    // Register Handlebars partials
    loadTemplates([
        "systems/fvtt-mds/templates/dice/dice-roll-dialog.hbs",
        "systems/fvtt-mds/templates/dice/dice-roll-result.hbs",
        "systems/fvtt-mds/templates/sheets/partials/aels.hbs",
        "systems/fvtt-mds/templates/sheets/partials/blessure.hbs",
        "systems/fvtt-mds/templates/sheets/partials/equipement.hbs",
        "systems/fvtt-mds/templates/sheets/partials/technique.hbs",
        "systems/fvtt-mds/templates/sheets/partials/header.hbs",
        "systems/fvtt-mds/templates/sheets/partials/profile.hbs"
    ]);
});
