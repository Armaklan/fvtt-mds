/**
 * Extends the basic ActorSheet with specific features for Mousquetaire de Sang.
 */
import { DiceRoller } from "../dice/DiceRoller";

export class PlayerCharacterSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["fvtt-mds", "sheet", "actor"],
      template: "systems/fvtt-mds/templates/sheets/actor-sheet.hbs",
      width: 1000,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "profiles" }]
    });
  }

  /** @override */
  getData() {
    const data = super.getData();
    console.log({actorData: data});

    // Add a flag to check if actor has Aels
    data.hasAels = this.actor.items.some(i => i.type === "aels");

    // Calculate maximum fatigue
    const swordsmanValue = this.actor.system.profiles.swordsman.value || 1;
    const adventurerValue = this.actor.system.profiles.adventurer.value || 1;
    const maxFatigue = 5 + swordsmanValue + adventurerValue;

    // Update the max fatigue value if it has changed
    if (this.actor.system.fatigue.max !== maxFatigue) {
      this.actor.update({"system.fatigue.max": maxFatigue});
    }

    return data;
  }

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Add Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Item
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Resource Controls
    html.find('.increase-fatigue').click(async (event) => {
      event.preventDefault();
      const currentValue = this.actor.system.fatigue.value;
      const maxValue = this.actor.system.fatigue.max;
      if (currentValue < maxValue) {
        await this.actor.update({"system.fatigue.value": currentValue + 1});
      }
    });

    html.find('.decrease-fatigue').click(async (event) => {
      event.preventDefault();
      const currentValue = this.actor.system.fatigue.value;
      if (currentValue > 0) {
        await this.actor.update({"system.fatigue.value": currentValue - 1});
      }
    });

    html.find('.increase-panache').click(async (event) => {
      event.preventDefault();
      const currentValue = this.actor.system.panache.value;
      await this.actor.update({"system.panache.value": currentValue + 1});
    });

    html.find('.decrease-panache').click(async (event) => {
      event.preventDefault();
      const currentValue = this.actor.system.panache.value;
      if (currentValue > 0) {
        await this.actor.update({"system.panache.value": currentValue - 1});
      }
    });

    // Profile Roll
    html.find('.profile-item').on('click', async (event) => {
      // Ignore clicks on the input element
      if ($(event.target).is('input')) return;

      const profileItem = $(event.currentTarget);
      const profileLabel = profileItem.find('label').text();
      const profileValue = Number(profileItem.find('input').val());

      await this._onProfileRoll(profileLabel, profileValue);
    });

    // Modification des techniques
    html.find(".technique-item input").change(async (event) => {
      const li = $(event.currentTarget).closest(".technique-item");
      const itemId = li.data("item-id");
      const item = this.actor.items.get(itemId);
      if (!item) return;

      // Récupération des deux champs depuis le <li>
      const name = li.find('input[name="technique-name"]').val();
      const value = Number(li.find('input[name="technique-value"]').val());

      // Mise à jour de l'item
      await item.update({
        name: name,
        "system.value": value
      });
    });

    // Modification des aels
    html.find(".aels-item input").change(async (event) => {
      const aelsItem = $(event.currentTarget).closest(".aels-item");
      const itemId = aelsItem.data("item-id");
      const item = this.actor.items.get(itemId);
      if (!item) return;

      // Récupération des deux champs depuis le div
      const name = aelsItem.find('input[name="aels-type"]').val();
      const value = Number(aelsItem.find('input[name="aels-value"]').val());

      // Mise à jour de l'item
      await item.update({
        name: name,
        "system.value": value
      });
    });

    // Modification des blessures
    html.find(".blessure-item input").change(async (event) => {
      const li = $(event.currentTarget).closest(".blessure-item");
      const itemId = li.data("item-id");
      const item = this.actor.items.get(itemId);
      if (!item) return;

      // Récupération du nom depuis le <li>
      const name = li.find('input[name="blessure-name"]').val();

      // Mise à jour de l'item
      await item.update({
        name: name
      });
    });

    // Modification des equipements
    html.find(".equipement-item input").change(async (event) => {
      const li = $(event.currentTarget).closest(".equipement-item");
      const itemId = li.data("item-id");
      const item = this.actor.items.get(itemId);
      if (!item) return;

      // Récupération du nom depuis le <li>
      const name = li.find('input[name="equipement-name"]').val();

      // Mise à jour de l'item
      await item.update({
        name: name
      });
    });
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  private async _onItemCreate(event: JQuery.ClickEvent) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);

    // Check if trying to create an Aels and one already exists
    if (type === "aels") {
      const existingAels = this.actor.items.find(i => i.type === "aels");
      if (existingAels) {
        // If an Aels already exists, delete it before creating a new one
        await this.actor.deleteEmbeddedDocuments("Item", [existingAels.id]);
      }
    }

    let itemData;
    if (type === "blessure" || type === "equipements") {
      // For blessure and equipements, only include name (no value)
      itemData = {
        name: `New ${typeName}`,
        type: type,
        system: {}
      };
    } else {
      // For other types (technique, aels), include value
      itemData = {
        name: `New ${typeName}`,
        type: type,
        system: { value: 0 }
      };
    }
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle deleting an Owned Item from the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  private async _onItemDelete(event: JQuery.ClickEvent) {
    event.preventDefault();
    const element = $(event.currentTarget).closest(".technique-item, .aels-item, .blessure-item, .equipement-item");
    const itemId = element.data("item-id");
    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /**
   * Handle profile roll
   * @param {string} profileLabel - The label of the profile
   * @param {number} profileValue - The value of the profile
   * @private
   */
  private async _onProfileRoll(profileLabel: string, profileValue: number) {
    await DiceRoller.showRollDialog(profileLabel, profileValue, this.actor);
  }

}
