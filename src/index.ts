import "./styles/main.scss";
import { PlayerCharacterSheet } from "./module/sheets/PlayerCharacterSheet";

Hooks.once("init", async () => {
  console.log("Custom System | Initialisation");

  // Register custom sheets
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fvtt-mds", PlayerCharacterSheet, {
    types: ["playerCharacter"],
    makeDefault: true
  });
});
