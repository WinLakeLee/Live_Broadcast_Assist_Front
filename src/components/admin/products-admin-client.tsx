"use client";
import { useCallback, useState } from "react";
import { KeyRound, Plus, Save, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminProductInput, Product } from "@/lib/api/contracts";
import { getAdminProducts, saveAdminProduct, identifyProduct } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  adminFormToInput,
  adminProductFormSchema,
  blankAdminProductForm,
  productToAdminForm,
  sortAdminProducts,
  type AdminProductForm,
} from "@/features/admin-products/form-model";
export function ProductsAdminClient() {
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product>();
  const [pending, setPending] = useState<AdminProductInput>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [domain, setDomain] = useState("pokemon");
  const [identifying, setIdentifying] = useState(false);
  const form = useForm<AdminProductForm>({
    resolver: zodResolver(adminProductFormSchema),
    defaultValues: blankAdminProductForm,
  });
  const load = useCallback(async () => {
    if (!key || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await getAdminProducts(key);
      setProducts(sortAdminProducts(data));
      setVerified(true);
    } catch {
      setVerified(false);
      setMessage("관리자 인증 또는 상품 목록 조회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [key, busy]);
  const choose = (p?: Product) => {
    setSelected(p);
    form.reset(productToAdminForm(p));
  };
  const prepare = form.handleSubmit((value) => {
    if (selected && value.stock_limit < selected.reserved_quantity) {
      setMessage(
        "현재 예약수량보다 총 재고를 작게 입력했습니다. 서버에서도 저장을 거부합니다.",
      );
    }
    setPending(adminFormToInput(value));
  });
  const save = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const saved = await saveAdminProduct(key, pending);
      setPending(undefined);
      setMessage("상품을 저장했습니다.");
      const data = await getAdminProducts(key);
      setProducts(sortAdminProducts(data));
      const updated = data.find((p) => p.product_id === saved.product_id);
      choose(updated);
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      setPending(undefined);
      setMessage(
        api?.httpStatus === 409
          ? "예약수량보다 총 재고를 작게 줄일 수 없습니다. 최신 상품 정보를 다시 확인해 주세요."
          : "상품을 저장하지 못했습니다. 관리자 키와 입력값을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !key) return;
    setIdentifying(true);
    setMessage("");
    try {
      const res = await identifyProduct(key, file, domain);
      form.setValue("product_name", res.product_name);
      form.setValue("category_major", res.category_major);
      form.setValue("category_minor", res.category_minor);
      form.setValue("category_detail", res.category_detail);
      if (res.unit_price !== undefined) form.setValue("unit_price", res.unit_price);
      if (res.description) form.setValue("description", res.description);
      if (res.image_urls_text) form.setValue("image_urls_text", res.image_urls_text);
      setMessage("AI 식별에 성공했습니다. 폼 데이터를 확인해 주세요.");
    } catch {
      setMessage("AI 식별에 실패했습니다.");
    } finally {
      setIdentifying(false);
    }
  };

  if (!verified)
    return (
      <section className="card">
        <KeyRound aria-hidden="true" />
        <h2>관리자 API 키</h2>
        <p>
          키는 현재 화면의 메모리에만 보관되며 URL·브라우저 저장소·환경변수에
          저장하지 않습니다.
        </p>
        <div className="field">
          <label htmlFor="admin-key">API 키</label>
          <input
            id="admin-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        {message && (
          <div className="notice error" role="alert">
            {message}
          </div>
        )}
        <button
          className="button primary"
          disabled={!key || busy}
          onClick={load}
        >
          {busy ? "확인 중…" : "키 확인 및 상품 조회"}
        </button>
      </section>
    );
  return (
    <>
      <section className="card">
        <div className="actions">
          <button className="button" onClick={() => choose()}>
            <Plus size={17} /> 새 상품
          </button>
          <button
            className="button danger"
            onClick={() => {
              setVerified(false);
              setKey("");
              setProducts([]);
            }}
          >
            키 지우기
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>상품명</th>
                <th>단가</th>
                <th>총 재고</th>
                <th>예약</th>
                <th>구매 가능</th>
                <th>판매</th>
                <th>순서</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  className="selectable"
                  tabIndex={0}
                  key={p.product_id}
                  onClick={() => choose(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") choose(p);
                  }}
                >
                  <td>{p.product_name}</td>
                  <td>{formatMoney(p.unit_price)}</td>
                  <td>{p.stock_limit}</td>
                  <td>{p.reserved_quantity}</td>
                  <td>{p.available_quantity}</td>
                  <td>{p.active ? "판매" : "중지"}</td>
                  <td>{p.display_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <form className="card" onSubmit={prepare}>
        <h2>{selected ? `${selected.product_name} 수정` : "상품 추가"}</h2>
        <div className="actions" style={{ marginBottom: "1rem" }}>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} style={{ padding: "0.5rem" }}>
            <option value="pokemon">포켓몬 카드</option>
            <option value="yugioh">유희왕 카드</option>
          </select>
          <label className="button primary" style={{ cursor: "pointer" }}>
            <Camera size={17} /> 사진으로 식별 {identifying && "..."}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} disabled={identifying} />
          </label>
        </div>
        <p className="muted">
          예약수량은 조회만 가능하며 총 재고를 예약수량보다 낮출 수 없습니다.
          최종 판정은 서버가 수행합니다.
        </p>
        <div className="lookup-grid">
          <div className="field">
            <label htmlFor="product_name">상품명</label>
            <input
              id="product_name"
              {...form.register("product_name")}
            />
          </div>
          <div className="field">
            <label htmlFor="unit_price">단가</label>
            <input
              id="unit_price"
              type="number"
              min="0"
              {...form.register("unit_price", { valueAsNumber: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="stock_limit">총 재고</label>
            <input
              id="stock_limit"
              type="number"
              min="0"
              {...form.register("stock_limit", { valueAsNumber: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="display_order">표시순서</label>
            <input
              id="display_order"
              type="number"
              {...form.register("display_order", { valueAsNumber: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="purchase_method">구매 방식</label>
            <select id="purchase_method" {...form.register("purchase_method")}>
              <option value="fixed_price">고정가</option>
              <option value="auction">경매</option>
              <option value="reverse_auction">역경매</option>
              <option value="blind_auction">블라인드 경매</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="reserve_price">예약가/하한가</label>
            <input id="reserve_price" type="number" min="0" {...form.register("reserve_price", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="bid_increment">입찰 단위</label>
            <input id="bid_increment" type="number" min="0" {...form.register("bid_increment", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="bid_input_mode">입찰 입력 방식</label>
            <select id="bid_input_mode" {...form.register("bid_input_mode")}>
              <option value="direct_amount">직접 금액 입력</option>
              <option value="incremental">호가 자동 계산</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="minimum_offer_price">최소 제안가 (0=미설정)</label>
            <input id="minimum_offer_price" type="number" min="0" {...form.register("minimum_offer_price", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="maximum_offer_price">최대 제안가 (0=미설정)</label>
            <input id="maximum_offer_price" type="number" min="0" {...form.register("maximum_offer_price", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="buy_now_price">즉시 낙찰가 (0=미설정)</label>
            <input id="buy_now_price" type="number" min="0" {...form.register("buy_now_price", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="auction_extension_window_seconds">연장 감지 구간(초)</label>
            <input id="auction_extension_window_seconds" type="number" min="0" {...form.register("auction_extension_window_seconds", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="auction_extension_seconds">1회 연장 시간(초)</label>
            <input id="auction_extension_seconds" type="number" min="0" {...form.register("auction_extension_seconds", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="auction_max_extensions">최대 연장 횟수</label>
            <input id="auction_max_extensions" type="number" min="0" {...form.register("auction_max_extensions", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="sale_starts_at">판매 시작 시각</label>
            <input id="sale_starts_at" type="datetime-local" {...form.register("sale_starts_at")} />
          </div>
          <div className="field">
            <label htmlFor="sale_ends_at">판매 종료 시각</label>
            <input id="sale_ends_at" type="datetime-local" {...form.register("sale_ends_at")} />
          </div>
          <div className="field">
            <label htmlFor="sku">SKU</label>
            <input id="sku" {...form.register("sku")} />
          </div>
          <div className="field">
            <label htmlFor="catalog_item_id">카탈로그 상품 ID</label>
            <input id="catalog_item_id" placeholder="비우면 자동 생성" {...form.register("catalog_item_id")} />
          </div>
          <div className="field">
            <label htmlFor="seller_id">판매자 ID</label>
            <input id="seller_id" {...form.register("seller_id")} />
          </div>
          <div className="field">
            <label htmlFor="brand_name">브랜드</label>
            <input id="brand_name" {...form.register("brand_name")} />
          </div>
          <div className="field">
            <label htmlFor="manufacturer">제조사</label>
            <input id="manufacturer" {...form.register("manufacturer")} />
          </div>
          <div className="field">
            <label htmlFor="model_number">모델 번호</label>
            <input id="model_number" {...form.register("model_number")} />
          </div>
          <div className="field">
            <label htmlFor="product_type">상품 유형</label>
            <input id="product_type" {...form.register("product_type")} />
          </div>
          <div className="field">
            <label htmlFor="condition_type">상품 상태</label>
            <select id="condition_type" {...form.register("condition_type")}>
              <option value="new">새 상품</option>
              <option value="used_like_new">중고 - 최상</option>
              <option value="used_good">중고 - 양호</option>
              <option value="used_acceptable">중고 - 사용감 있음</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="parent_sku">부모 SKU</label>
            <input id="parent_sku" {...form.register("parent_sku")} />
          </div>
          <div className="field">
            <label htmlFor="barcode">바코드/상품 식별자</label>
            <input id="barcode" {...form.register("barcode")} />
          </div>
          <div className="field">
            <label htmlFor="warehouse_code">창고 코드</label>
            <input id="warehouse_code" {...form.register("warehouse_code")} />
          </div>
          <div className="field">
            <label htmlFor="inbound_quantity">입고예정 수량</label>
            <input id="inbound_quantity" type="number" min="0" {...form.register("inbound_quantity", { valueAsNumber: true })} />
          </div>
          <div className="field">
            <label htmlFor="category_major">대분류</label>
            <input id="category_major" {...form.register("category_major")} />
          </div>
          <div className="field">
            <label htmlFor="category_minor">소분류</label>
            <input id="category_minor" {...form.register("category_minor")} />
          </div>
          <div className="field">
            <label htmlFor="category_detail">상세분류</label>
            <input id="category_detail" {...form.register("category_detail")} />
          </div>
          <div className="field">
            <label htmlFor="expected_arrival_date">입고예정일</label>
            <input id="expected_arrival_date" type="date" {...form.register("expected_arrival_date")} />
          </div>
          <div className="field">
            <label htmlFor="arrival_date">실입고일</label>
            <input id="arrival_date" type="date" {...form.register("arrival_date")} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">상품 상세 설명</label>
          <textarea id="description" rows={5} {...form.register("description")} />
        </div>
        <div className="field">
          <label htmlFor="option_values_json">옵션 JSON</label>
          <textarea id="option_values_json" rows={4} placeholder={'{"색상":"블루","용량":"500ml"}'} {...form.register("option_values_json")} />
        </div>
        <div className="field">
          <label htmlFor="attributes_json">상세 속성 JSON</label>
          <textarea id="attributes_json" rows={5} placeholder={'{"재질":"스테인리스","원산지":"대한민국"}'} {...form.register("attributes_json")} />
        </div>
        <div className="field">
          <label htmlFor="image_urls_text">상품 이미지 HTTPS URL (한 줄에 하나)</label>
          <textarea id="image_urls_text" rows={4} {...form.register("image_urls_text")} />
        </div>
        <div className="field check">
          <label>
            <input type="checkbox" {...form.register("active")} />
            판매 활성화
          </label>
        </div>
        {Object.values(form.formState.errors).map((error, i) => (
          <p className="error-text" key={i}>
            {error.message}
          </p>
        ))}
        {message && (
          <div
            className={
              message.includes("저장했습니다")
                ? "notice success"
                : "notice error"
            }
            role="status"
          >
            {message}
          </div>
        )}
        <button className="button primary" disabled={busy}>
          <Save size={17} /> 저장 전 변경 확인
        </button>
      </form>
      {pending && (
        <ConfirmDialog
          title="상품 변경을 저장할까요?"
          onCancel={() => setPending(undefined)}
          onConfirm={save}
        >
          <div className="summary-row">
            <span>상품명</span>
            <strong>{pending.product_name}</strong>
          </div>
          <div className="summary-row">
            <span>단가</span>
            <strong>{formatMoney(pending.unit_price)}</strong>
          </div>
          <div className="summary-row">
            <span>총 재고</span>
            <strong>{pending.stock_limit}</strong>
          </div>
          <div className="summary-row">
            <span>판매 여부 / 순서</span>
            <strong>
              {pending.active ? "판매" : "중지"} / {pending.display_order}
            </strong>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
