const mongoose = require("mongoose");
const { model, Schema } = mongoose;
const bcrypt = require("bcrypt");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const HASH_ROUND = 10;

const userSchema = new Schema(
  {
    full_name: {
      type: String,
      required: [true, "Nama harus diisi"],
      minlength: [3, "Panjang nama minimal 3 karakter"],
      maxlength: [255, "Panjang nama maksimal 255 karakter"],
      trim: true,
    },

    customer_id: {
      type: Number,
    },

    email: {
      type: String,
      required: [true, "Email harus diisi"],
      maxlength: [255, "Panjang email maksimal 255 karakter"],
      unique: true, // Menjadikan email unik
      trim: true,
      validate: {
        validator: async function (value) {
          const EMAIL_RE = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
          if (!EMAIL_RE.test(value)) return false;

          // Pastikan email unik hanya saat membuat user baru
          if (this.isNew) {
            const count = await this.model("User").countDocuments({ email: value });
            return count === 0;
          }
          return true;
        },
        message: (props) => `${props.value} harus email yang valid atau sudah terdaftar!`,
      },
    },

    password: {
      type: String,
      required: [true, "Password harus diisi"],
      maxlength: [255, "Panjang password maksimal 255 karakter"],
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    token: [String],
  },
  { timestamps: true }
);

// Hash password hanya jika berubah
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, HASH_ROUND);
  }
  next();
});

userSchema.plugin(AutoIncrement, { inc_field: "customer_id" });

module.exports = model("User", userSchema);
