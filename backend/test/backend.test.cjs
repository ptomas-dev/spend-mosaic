const assert = require("node:assert/strict");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const express = require("express");

Object.assign(process.env, {
  DB_NAME: "spend_mosaic_test",
  DB_USER: "test",
  DB_PASSWORD: "test",
  DB_HOST: "127.0.0.1",
  DB_DIALECT: "postgres",
});

const sequelize = require("../dist/config/database").default;
const Expense = require("../dist/models/Expense").default;
const Income = require("../dist/models/Income").default;
const expensesRouter = require("../dist/routes/expenses").default;
const incomeRouter = require("../dist/routes/income").default;

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: server.address().port,
        method,
        path,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { data += chunk; });
        res.on("error", reject);
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

test("compiled backend preserves transaction API behavior", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/expenses", expensesRouter);
  app.use("/income", incomeRouter);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });

  try {
    for (const [path, model, name] of [
      ["/expenses", Expense, "Expense"],
      ["/income", Income, "Income"],
    ]) {
      const originalMethods = Object.fromEntries(
        ["findAll", "findByPk", "create", "destroy"].map((key) => [key, model[key]]),
      );
      const record = {
        id: 1,
        date: "2026-10-27",
        amount: 25,
        category: "Other",
        memo: "",
      };

      try {
        await t.test(`${path}: model schema and defaults remain unchanged`, () => {
          assert.equal(model.tableName, name === "Expense" ? "Expenses" : "Incomes");
          const attributes = model.getAttributes();
          assert.equal(attributes.amount.type.key, "FLOAT");
          assert.equal(attributes.amount.allowNull, false);
          assert.equal(attributes.category.allowNull, false);
          assert.equal(attributes.memo.defaultValue, "");
          assert.equal(attributes.date.type.key, "DATE");
          assert.equal(attributes.date.defaultValue.key, "NOW");
          assert.ok(attributes.createdAt);
          assert.ok(attributes.updatedAt);
        });

        await t.test(`${path}: lists records and empty lists`, async () => {
          for (const records of [[record], []]) {
            model.findAll = async () => records;
            assert.deepEqual(await request(server, "GET", path), {
              status: 200, body: records,
            });
          }
        });

        await t.test(`${path}: creates records with existing normalization`, async () => {
          const input = { ...record, amount: "25", category: " Other " };
          delete input.id;
          model.create = async (values) => {
            assert.deepEqual(values, {
              ...input,
              amount: name === "Expense" ? "25" : 25,
              category: name === "Expense" ? " Other " : "Other",
            });
            return record;
          };
          assert.deepEqual(await request(server, "POST", path, input), {
            status: 201, body: record,
          });
        });

        await t.test(`${path}: rejects missing creation fields`, async () => {
          model.create = async () => assert.fail("Invalid input reached the model");
          for (const body of [{}, { ...record, amount: 0 }]) {
            const response = await request(server, "POST", path, body);
            assert.equal(response.status, 400);
            assert.deepEqual(response.body, {
              error: name === "Expense"
                ? "All fields are required"
                : "Date, positive amount, and category are required",
            });
          }
        });

        await t.test(`${path}: updates records and normalizes payloads`, async () => {
          const { id, ...values } = record;
          model.findByPk = async (key) => {
            assert.equal(key, String(id));
            return {
              ...record,
              async update(payload) {
                assert.deepEqual(payload, values);
              },
            };
          };
          assert.deepEqual(
            await request(server, "PUT", `${path}/1`, {
              ...values, amount: "25", category: " Other ", memo: null,
            }),
            { status: 200, body: record },
          );
        });

        await t.test(`${path}: rejects invalid updates before model access`, async () => {
          model.findByPk = async () => assert.fail("Invalid input reached the model");
          for (const invalid of [
            { ...record, date: "" },
            { ...record, amount: 0 },
            { ...record, amount: -1 },
            { ...record, amount: "invalid" },
            { ...record, category: " " },
          ]) {
            assert.deepEqual(await request(server, "PUT", `${path}/1`, invalid), {
              status: 400,
              body: { error: "Date, positive amount, and category are required" },
            });
          }
        });

        await t.test(`${path}: returns 404 when updating missing records`, async () => {
          model.findByPk = async () => null;
          assert.deepEqual(await request(server, "PUT", `${path}/1`, record), {
            status: 404, body: { error: `${name} not found` },
          });
        });

        await t.test(`${path}: deletes records and reports missing records`, async () => {
          for (const count of [1, 0]) {
            model.destroy = async (options) => {
              assert.deepEqual(options, { where: { id: "1" } });
              return count;
            };
            assert.deepEqual(await request(server, "DELETE", `${path}/1`), {
              status: count ? 200 : 404,
              body: count
                ? { message: `${name} deleted successfully` }
                : { error: `${name} not found` },
            });
          }
        });

        if (name === "Expense") {
          await t.test("expense lookup preserves 200 responses for records and null", async () => {
            for (const result of [record, null]) {
              model.findByPk = async (id) => {
                assert.equal(id, "1");
                return result;
              };
              assert.deepEqual(await request(server, "GET", `${path}/1`), {
                status: 200, body: result,
              });
            }
          });
        }

        await t.test(`${path}: preserves database failure status and error bodies`, async () => {
          const failure = new Error("Database unavailable");
          const fail = async () => { throw failure; };
          model.findAll = fail;
          model.findByPk = fail;
          model.create = fail;
          model.destroy = fail;
          const originalError = console.error;
          const errors = [];
          console.error = (...args) => errors.push(args);
          try {
            const cases = [
              ["GET", path, undefined, { error: `An error occurred while retrieving ${name.toLowerCase()}s` }],
              ["POST", path, record, name === "Expense"
                ? { err: {} }
                : { error: "An error occurred while creating the income" }],
              ["PUT", `${path}/1`, record, { error: `An error occurred while updating the ${name.toLowerCase()}` }],
              ["DELETE", `${path}/1`, undefined, { error: `An error occurred while deleting the ${name.toLowerCase()}` }],
            ];
            if (name === "Expense") {
              cases.push(["GET", `${path}/1`, undefined, { error: "An error occurred while retrieving expenses" }]);
            }
            for (const [method, url, body, expected] of cases) {
              assert.deepEqual(await request(server, method, url, body), {
                status: 500, body: expected,
              });
            }
            assert.equal(errors.length, 4);
            assert.ok(errors.every((args) => args[1] === failure));
          } finally {
            console.error = originalError;
          }
        });
      } finally {
        Object.assign(model, originalMethods);
      }
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await sequelize.close();
  }
});

test("database configuration reports missing or unsupported settings", () => {
  for (const [key, value, message] of [
    ["DB_NAME", undefined, "Missing required environment variable: DB_NAME"],
    ["DB_USER", undefined, "Missing required environment variable: DB_USER"],
    ["DB_PASSWORD", undefined, "Missing required environment variable: DB_PASSWORD"],
    ["DB_DIALECT", undefined, "Unsupported or missing DB_DIALECT: undefined"],
    ["DB_DIALECT", "invalid", "Unsupported or missing DB_DIALECT: invalid"],
  ]) {
    const env = { ...process.env };
    if (value === undefined) delete env[key];
    else env[key] = value;
    const result = spawnSync(process.execPath, ["-e", "require('./dist/config/database')"], {
      cwd: require("node:path").resolve(__dirname, ".."),
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(message), result.stderr);
  }
});

test("development and compiled entry points wait for database sync before listening", () => {
  for (const directory of ["src", "dist"]) {
    for (const failSync of [false, true]) {
      const script = `
        const assert = require("node:assert/strict");
        const express = require("express");
        const sequelize = require("./${directory}/config/database").default;
        let synced = false;
        sequelize.sync = async () => {
          if (${failSync}) throw new Error("Test sync failure");
          synced = true;
        };
        express.application.listen = function (port, callback) {
          assert.ok(synced);
          assert.equal(port, 5000);
          callback();
          console.log("Test listener ready");
        };
        require("./${directory}/server");
      `;
      const result = spawnSync(
        process.execPath,
        [...(directory === "src" ? ["-r", "ts-node/register"] : []), "-e", script],
        {
          cwd: require("node:path").resolve(__dirname, ".."),
          env: process.env,
          encoding: "utf8",
        },
      );
      assert.equal(result.status, 0, result.stderr);
      if (failSync) {
        assert.ok(result.stderr.includes("Failed to sync database:"));
        assert.ok(result.stderr.includes("Test sync failure"));
        assert.ok(!result.stdout.includes("Test listener ready"));
      } else {
        assert.ok(result.stdout.includes("Database synced!"));
        assert.ok(result.stdout.includes("Test listener ready"));
        assert.equal(result.stderr, "");
      }
    }
  }
});
