"use client";
import { useCallback, useState } from "react";
import { KeyRound, Plus, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AdminProductInput, Product } from "@/lib/api/contracts";
import { getAdminProducts, saveAdminProduct } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
const schema = z.object({
  product_name: z.string().trim().min(1, "상품명을 입력해 주세요."),
  unit_price: z.number().int().positive("단가는 1원 이상이어야 합니다."),
  stock_limit: z.number().int().nonnegative(),
  active: z.boolean(),
  display_order: z
    .number()
    .int()
    .min(0)
    .max(1_000_000, "표시순서는 0~1,000,000이어야 합니다."),
  purchase_method: z.enum(["fixed_price", "auction", "reverse_auction", "blind_auction"]),
  reserve_price: z.number().int().nonnegative(),
  bid_increment: z.number().int().nonnegative(),
  sale_starts_at: z.string(),
  sale_ends_at: z.string(),
  sku: z.string().max(100),
  category_major: z.string().max(100),
  category_minor: z.string().max(100),
  category_detail: z.string().max(100),
  expected_arrival_date: z.string(),
  arrival_date: z.string(),
  catalog_item_id: z.string().max(100),
  seller_id: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  brand_name: z.string().max(100),
  manufacturer: z.string().max(200),
  model_number: z.string().max(100),
  product_type: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().max(5000),
  condition_type: z.enum(["new", "used_like_new", "used_good", "used_acceptable"]),
  parent_sku: z.string().max(100),
  barcode: z.string().max(100),
  option_values_json: z.string().refine((value) => isStringRecord(value), "옵션은 JSON 객체여야 합니다."),
  attributes_json: z.string().refine((value) => isStringRecord(value), "속성은 JSON 객체여야 합니다."),
  image_urls_text: z.string().refine(
    (value) => value.split(/\r?\n/).filter(Boolean).every((url) => /^https:\/\//.test(url)),
    "이미지는 줄마다 HTTPS URL을 입력해 주세요.",
  ),
  warehouse_code: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  inbound_quantity: z.number().int().nonnegative(),
});
function isStringRecord(value: string) {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    return Boolean(parsed) && !Array.isArray(parsed) && typeof parsed === "object" &&
      Object.entries(parsed as Record<string, unknown>).every(([key, item]) => key && typeof item === "string");
  } catch {
    return false;
  }
}
type Form = z.infer<typeof schema>;
const blank: Form = {
  product_name: "",
  unit_price: 1,
  stock_limit: 0,
  active: true,
  display_order: 1,
  purchase_method: "fixed_price",
  reserve_price: 0,
  bid_increment: 0,
  sale_starts_at: "",
  sale_ends_at: "",
  sku: "",
  category_major: "",
  category_minor: "",
  category_detail: "",
  expected_arrival_date: "",
  arrival_date: "",
  catalog_item_id: "",
  seller_id: "direct",
  brand_name: "",
  manufacturer: "",
  model_number: "",
  product_type: "GENERAL",
  description: "",
  condition_type: "new",
  parent_sku: "",
  barcode: "",
  option_values_json: "{}",
  attributes_json: "{}",
  image_urls_text: "",
  warehouse_code: "MAIN",
  inbound_quantity: 0,
};
export function ProductsAdminClient() {
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product>();
  const [pending, setPending] = useState<AdminProductInput>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });
  const load = useCallback(async () => {
    if (!key || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await getAdminProducts(key);
      setProducts(data.sort((a, b) => a.display_order - b.display_order));
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
    form.reset(
      p
        ? {
            product_name: p.product_name,
            unit_price: p.unit_price,
            stock_limit: p.stock_limit,
            active: p.active,
            display_order: p.display_order,
            purchase_method: p.purchase_method,
            reserve_price: p.reserve_price,
            bid_increment: p.bid_increment,
            sale_starts_at: p.sale_starts_at,
            sale_ends_at: p.sale_ends_at,
            sku: p.sku,
            category_major: p.category_major,
            category_minor: p.category_minor,
            category_detail: p.category_detail,
            expected_arrival_date: p.expected_arrival_date,
            arrival_date: p.arrival_date,
            catalog_item_id: p.catalog?.catalog_item_id ?? "",
            seller_id: p.listing?.seller_id ?? "direct",
            brand_name: p.catalog?.brand_name ?? "",
            manufacturer: p.catalog?.manufacturer ?? "",
            model_number: p.catalog?.model_number ?? "",
            product_type: p.catalog?.product_type ?? "GENERAL",
            description: p.catalog?.description ?? "",
            condition_type: p.listing?.condition_type ?? "new",
            parent_sku: p.catalog?.parent_sku ?? "",
            barcode: p.catalog?.barcode ?? "",
            option_values_json: JSON.stringify(p.catalog?.option_values ?? {}, null, 2),
            attributes_json: JSON.stringify(p.catalog?.attributes ?? {}, null, 2),
            image_urls_text: (p.catalog?.image_urls ?? []).join("\n"),
            warehouse_code: p.inventory[0]?.location_code ?? "MAIN",
            inbound_quantity: p.inventory[0]?.inbound_quantity ?? 0,
          }
        : blank,
    );
  };
  const prepare = form.handleSubmit((value) => {
    if (selected && value.stock_limit < selected.reserved_quantity) {
      setMessage(
        "현재 예약수량보다 총 재고를 작게 입력했습니다. 서버에서도 저장을 거부합니다.",
      );
    }
    const { option_values_json, attributes_json, image_urls_text, ...base } = value;
    setPending({
      ...base,
      option_values: JSON.parse(option_values_json || "{}") as Record<string, string>,
      attributes: JSON.parse(attributes_json || "{}") as Record<string, string>,
      image_urls: image_urls_text.split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
    });
  });
  const save = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveAdminProduct(key, pending);
      setPending(undefined);
      setMessage("상품을 저장했습니다.");
      const data = await getAdminProducts(key);
      setProducts(data.sort((a, b) => a.display_order - b.display_order));
      const updated = data.find((p) => p.product_name === pending.product_name);
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
                  key={p.product_name}
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
        <p className="muted">
          예약수량은 조회만 가능하며 총 재고를 예약수량보다 낮출 수 없습니다.
          최종 판정은 서버가 수행합니다.
        </p>
        <div className="lookup-grid">
          <div className="field">
            <label htmlFor="product_name">상품명</label>
            <input
              id="product_name"
              readOnly={Boolean(selected)}
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
