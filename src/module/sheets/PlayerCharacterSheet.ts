/**
 * Extends the basic ActorSheet with specific features for Mousquetaire de Sang.
 */
export class PlayerCharacterSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fvtt-mds", "sheet", "actor"],
      template: "systems/fvtt-mds/templates/sheets/actor-sheet.hbs",
      width: 800,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "profiles" }]
    });
  }

  /** @override */
  getData() {
    const data = super.getData();
    console.log({actorData: data})
    return data;
  }

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Add Technique Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Technique Item
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Modification des items
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
    const itemData = {
      name: `New ${typeName}`,
      type: type,
      system: { value: 0 }
    };
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle deleting an Owned Item from the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  private async _onItemDelete(event: JQuery.ClickEvent) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".technique-item");
    const itemId = li.data("item-id");
    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }
}
