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
    console.log({actorData: data});

    // Add a flag to check if actor has Aels
    data.hasAels = this.actor.items.some(i => i.type === "aels");

    return data;
  }

  /** @override */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Add Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Item
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Profile Roll
    html.find('.profile-item').on('click', (event) => {
      // Ignore clicks on the input element
      if ($(event.target).is('input')) return;

      const profileItem = $(event.currentTarget);
      const profileLabel = profileItem.find('label').text();
      const profileValue = Number(profileItem.find('input').val());

      this._onProfileRoll(profileLabel, profileValue);
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
    const element = $(event.currentTarget).closest(".technique-item, .aels-item");
    const itemId = element.data("item-id");
    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /**
   * Handle profile roll
   * @param {string} profileLabel - The label of the profile
   * @param {number} profileValue - The value of the profile
   * @private
   */
  private _onProfileRoll(profileLabel: string, profileValue: number) {
    // Get Aels information
    const aelsItem = this.actor.items.find(i => i.type === "aels");
    const hasAels = !!aelsItem;
    const aelsValue = hasAels ? aelsItem.system.value : 0;

    // Create dialog content
    const dialogContent = `
      <form>
        <div class="form-group">
          <label>Dé bonus:</label>
          <input type="number" name="bonusDice" value="0" min="0">
        </div>
        <div class="form-group">
          <label>Bonus statique:</label>
          <input type="number" name="staticBonus" value="0" min="0">
        </div>
        ${hasAels ? `
        <div class="form-group">
          <label>
            <input type="checkbox" name="useAels">
            Utilisation de l'Aels (Puissance: ${aelsValue})
          </label>
        </div>
        ` : ''}
      </form>
    `;

    // Show dialog
    new Dialog({
      title: `Jet de ${profileLabel} (${profileValue})`,
      content: dialogContent,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice"></i>',
          label: "Lancer les dés",
          callback: (html) => {
            const form = html.find('form')[0];
            const bonusDice = parseInt(form.bonusDice.value) || 0;
            const staticBonus = parseInt(form.staticBonus.value) || 0;
            const useAels = hasAels && form.useAels?.checked;

            this._performDiceRoll(profileLabel, profileValue, bonusDice, staticBonus, useAels, aelsValue);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "roll"
    }).render(true);
  }

  /**
   * Perform the dice roll with the specified parameters
   * @param {string} profileLabel - The label of the profile
   * @param {number} profileValue - The value of the profile
   * @param {number} bonusDice - Number of bonus dice
   * @param {number} staticBonus - Static bonus to add to the result
   * @param {boolean} useAels - Whether to use Aels
   * @param {number} aelsValue - The value of the Aels
   * @private
   */
  private async _performDiceRoll(
    profileLabel: string, 
    profileValue: number, 
    bonusDice: number, 
    staticBonus: number, 
    useAels: boolean, 
    aelsValue: number
  ) {
    // Calculate total dice to roll
    const totalDice = profileValue + bonusDice;

    // Roll the dice
    const roll = await new Roll(`${totalDice}d10`).evaluate({async: true});

    // Get individual dice results
    const diceResults = roll.dice[0].results.map(d => d.result);

    // Find the highest die value
    const highestDieValue = Math.max(...diceResults);

    // Calculate total using only the highest die
    let total = highestDieValue + staticBonus;

    // Check for Aels bonus
    let aelsBonus = 0;
    if (useAels && aelsValue > 1) {
      diceResults.forEach(result => {
        if (result === aelsValue) {
          aelsBonus += 2;
        }
      });
      total += aelsBonus;
    }

    // Check for complications (half or more dice showing "1")
    const onesCount = diceResults.filter(r => r === 1).length;
    const hasComplication = onesCount >= Math.ceil(totalDice / 2);

    // Check for advantages (multiple dice showing the same value, except 1)
    const valueCounts = {};
    diceResults.forEach(result => {
      if (result !== 1) {
        valueCounts[result] = (valueCounts[result] || 0) + 1;
      }
    });

    // Find values that appear multiple times (for advantage highlighting)
    const advantageValues = Object.entries(valueCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([value, _]) => parseInt(value));

    const hasAdvantage = advantageValues.length > 0;

    // Prepare the message content
    let messageContent = `
      <div class="dice-roll">
        <h3>${profileLabel} (${profileValue})</h3>
        <div class="dice-result">
          <div class="dice-formula">Highest of ${totalDice}d10 + ${staticBonus}</div>
          <div class="dice-tooltip">
            <div class="dice">
              ${diceResults.map(r => {
                let dieClass = "die d10";
                if (r === 1) dieClass += " complication-die";
                if (useAels && r === aelsValue) dieClass += " aels-die";
                if (advantageValues.includes(r)) dieClass += " advantage-die";
                if (r === highestDieValue) dieClass += " highest-die";
                return `<span class="${dieClass}">${r}</span>`;
              }).join('')}
            </div>
          </div>
          <h4 class="dice-total">${total}</h4>
          ${aelsBonus > 0 ? `<div class="aels-bonus">Bonus Aels: +${aelsBonus}</div>` : ''}
          ${hasComplication ? `<div class="complication">Complication!</div>` : ''}
          ${hasAdvantage ? `<div class="advantage">Avantage!</div>` : ''}
        </div>
      </div>
    `;

    // Create the chat message
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: messageContent,
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll
    });
  }
}
