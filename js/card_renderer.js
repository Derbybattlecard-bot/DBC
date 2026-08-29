      /* 2. 拡大パターン（.crc-card-large）のフォント・レイアウト調整 */
      .crc-card-large {
        padding: 16px;
        min-height: 480px; /* フォント拡大に伴いカードの高さを拡張 */
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
        border-radius: 12px;
        background: #ffffff;
      }

      /* 馬名：18px -> 36px (2倍) */
      .crc-card-large .crc-deck-name {
        font-size: 36px;
        line-height: 1.2;
      }

      /* バッジ類：12px -> 22px (約2倍) */
      .crc-card-large .crc-rarity-badge,
      .crc-card-large .crc-gen-badge {
        font-size: 22px;
        padding: 4px 10px;
        border-radius: 8px;
      }

      /* 適性・脚質詳細テキスト：13px -> 24px (約2倍) */
      .crc-card-large .crc-deck-details {
        font-size: 24px;
        line-height: 1.3;
        gap: 8px;
      }

      /* ステータスパラメータ表示：13px -> 24px (約2倍) */
      .crc-card-large .crc-deck-params {
        font-size: 24px;
        padding: 6px 10px;
        border-radius: 8px;
      }

      /* アビリティボタン：12px -> 22px (約2倍) */
      .crc-card-large .crc-ability-btn {
        font-size: 22px;
        padding: 6px 0;
        border-radius: 6px;
      }

      /* 画像エリアの高さ拡張 */
      .crc-large-image-box {
        width: 100%;
        height: 180px;
        background: #f2f7f3;
        border-radius: 8px;
        border: 2px dashed #b5d4ba;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .crc-large-image-box img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
