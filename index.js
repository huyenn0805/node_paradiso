const mysql = require('mysql');
const exp = require('express');
const app = exp();
const bodyParser = require('body-parser');  // Thư viện để xử lý dữ liệu POST

const fs = require('fs');
var cors = require('cors');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use([cors(), exp.json()]);

//connect database
const db = mysql.createConnection({
    host: 'localhost', user:  'root', password: '', port: 3306, database: 'datn3'
})
db.connect(err=>{
    if(err) throw err;
    console.log("Đã kết nối database");
})

// //lấy tất cả Homestay
// app.get('/homestay', function(req, res){
//     let sql = `SELECT * FROM homestay`
//     db.query (sql, (err, data) =>{
//         if(err) res.json({"thongbao":"Lỗi lấy list homestay", err});
//         else res.json(data);
//     })
// })
//lấy hết loại
app.get('/loai', function(req, res) {
    db.query(`SELECT id, ten_Loai FROM loai_homestay `,(err, data) => {
      if (err) res.json({"thongbao": "lỗi lấy loại", err });
      else res.json(data);
    })
  })
//lấy thông tin của 1 loại
app.get('/loaihomestay/:id_loai', function (req, res) {
    let id_loai = parseInt(req.params.id_loai)
    if (isNaN(id_loai) || id_loai <= 0) {
        res.json({"thongbao":"Không biết loại", "id_loai": id_loai}); return;
    }
    let sql = `SELECT id_Loai, ten_Loai FROM loai_homestay WHERE id_Loai =?`
    db.query(sql, id_loai, (err, data)=>{
        if(err) res.json({"thongbao":"Lỗi lấy  loai", err});
        else res.json(data[0]);
    })
})

//lấy theo loại homestay
app.get('/homestayTrongLoai/:id_loai', function(req, res){
    let id_Loai = parseInt(req.params.id_loai)
    if (isNaN(id_Loai) || id_Loai <= 0) {
        res.json({"thongbao":"Không biết loại", "id_Loai": id_Loai}); return;
    }
    let sql = `SELECT *  FROM homestay WHERE id_Loai =? ORDER BY id_homestay desc`
    db.query(sql, id_Loai, (err, data)=>{
        if(err) res.json({"thongbao":"Lỗi lấy sản phẩm trong loai", err});
        else res.json(data);
    })
})

// API lấy danh sách hình ảnh của homestay
app.get('/admin/homestay', (req, res) => {
    const id_homestay = req.params.id;

    const query = `
    SELECT *
    FROM homestay, hinh_homestay, hinh_anh
    WHERE homestay.id_homestay = hinh_homestay.id_homestay 
    AND hinh_homestay.id_hinh = hinh_anh.id_hinh
    `;
    db.query(query, [id_homestay], (err, results) => {
        if (err) {
            console.error('Error fetching images:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});



// show loại homestay trong admin
app.get('/admin/loai', function (req, res){
    let sql = `SELECT * FROM loai_homestay`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy list sp", err});
        else res.json(data);
    })
})
//định nghĩa route lấy chi tiết 1 homestay trong admin
app.get('/admin/homestay/:id', function (req, res) {
    let id = parseInt(req.params.id);
    if (id <= 0){
        res.json({"thongbao":"Không tìm thấy sản phẩm", "id": id}); return;
    }
    let sql = `SELECT * FROM homestay WHERE id_homestay = ?`
    db.query(sql, id, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy 1 sp", err});
        else res.json(data[0]);
    })
})
//định nghĩa route lấy chi tiết 1 loại homestay trong admin
app.get('/admin/loai/:id', function (req, res) {
    let id = parseInt(req.params.id);
    if (id <= 0){
        res.json({"thongbao":"Không tìm thấy sản phẩm", "id": id}); return;
    }
    let sql = `SELECT * FROM loai_homestay WHERE id_Loai = ?`
    db.query(sql, id, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy 1 sp", err});
        else res.json(data[0]);
    })
})

//định nghĩa route thêm sản phẩm
// app.post('/admin/homestay', function (req, res){
//     let data = req.body;
//     let sql = `INSERT INTO homestay SET?`
//     db.query(sql, data, (err, data) => {
//         if(err) 
//             res.json({"thongbao": "Lỗi thêm sản phẩm", err});
//         else 
//             res.json({"thongbao":"Đã thêm sản phẩm thành công", "id_sp": data.insertId});
//     })
// })
app.post('/admin/homestay', (req, res) => {
    const { ten_homestay, gia_homestay, url_hinh, TrangThai, id_Loai, mota } = req.body;

    // Kiểm tra dữ liệu cần thiết
    if (!ten_homestay || !gia_homestay || !url_hinh || !TrangThai || !id_Loai || !mota) {
        return res.status(400).send('Thiếu thông tin cần thiết.');
    }

    // Bước 1: Thêm homestay vào bảng `homestay`
    const insertHomestayQuery = `
        INSERT INTO homestay (ten_homestay, gia_homestay, TrangThai, id_Loai, mota) VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(insertHomestayQuery, [ten_homestay, gia_homestay, TrangThai, id_Loai, mota], (err, homestayResult) => {
        if (err) {
            console.error('Error inserting homestay:', err);
            return res.status(500).send('Error inserting homestay');
        }

        const insertedHomestayId = homestayResult.insertId;  // Lấy `id_homestay` vừa được thêm

        // Bước 2: Thêm URL hình ảnh vào bảng `hinh_anh`
        const insertImageQuery = `
            INSERT INTO hinh_anh (url_hinh) VALUES (?)
        `;
        
        db.query(insertImageQuery, [url_hinh], (err, imageResult) => {
            if (err) {
                console.error('Error inserting image:', err);
                return res.status(500).send('Error inserting image');
            }

            const insertedImageId = imageResult.insertId;  // Lấy `id_hinh` vừa được thêm

            // Bước 3: Thêm vào bảng `hinh_homestay` để liên kết homestay và hình ảnh
            const insertHomestayImageQuery = `
                INSERT INTO hinh_homestay (id_homestay, id_hinh) VALUES (?, ?)
            `;
            
            db.query(insertHomestayImageQuery, [insertedHomestayId, insertedImageId], (err, result) => {
                if (err) {
                    console.error('Error inserting homestay-image relation:', err);
                    return res.status(500).send('Error inserting homestay-image relation');
                }

                res.status(200).send('Thêm homestay và hình ảnh thành công');
            });
        });
    });
});






//định nghĩa route sửa sản phẩm
app.put('/admin/sp/:id', function (req, res){
    let id = req.params.id;
    let data = req.body;
    let sql = `UPDATE homestay SET? WHERE id_homestay =?`
    db.query(sql, [data, id], (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi sửa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã sửa sản phẩm thành công"});
    })
})

//định nghĩa route xóa sản phẩm
app.delete('/admin/homestay/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM homestay WHERE id_homestay =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})

//Định nghĩa route thêm loại
app.post('/admin/loai', function (req, res){
    let data = req.body;
    let sql = `INSERT INTO loai_homestay SET?`
    db.query(sql, data, (err, data) => {
        if(err) 
            res.json({"thongbao": "Lỗi thêm sản phẩm", err});
        else 
            res.json({"thongbao":"Đã thêm sản phẩm thành công", "id_sp": data.insertId});
    })
})

//định nghĩa route sửa loại homestay
app.put('/admin/loai/:id', function (req, res){
    let id = req.params.id;
    let data = req.body;
    let sql = `UPDATE loai_homestay SET? WHERE id_Loai =?`
    db.query(sql, [data, id], (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi sửa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã sửa sản phẩm thành công"});
    })
})


//định nghĩa route xóa loại homestay
app.delete('/admin/loai/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM loai_homestay WHERE id_Loai =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})

//định nghĩa route ds User

app.get('/admin/user', function (req, res){
    let sql = `SELECT * FROM users`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗii lấy list user", err});
        else res.json(data);
    })
})

// const  PRIVATE_KEY =  fs.readFileSync("private-key.txt")
// // đăng ký
// app.post('/dangky', function (req, res){
//     let data = req.body;
//     let sql = `INSERT INTO users  SET?`
//     db.query(sql, data, (err, data) => {
//         if(err) 
//             res.json({"thongbao": "Lỗi đăng ký", err});
//         else 
//             res.json({"thongbao":"Đã đăng ký thành công", "id": data.insertId});
//     })
// })
// //authen login
// app.post('/login', function(req, res) {
//     const em = req.body.em
//     const pw = req.body.pw
//     checkUserPass(em, pw, (err, user) =>{
//     if (err) {
//         return res.status(500).json({ error: "Đã xảy ra lỗi khi kiểm tra thông tin người dùng." ,err});
//     }

//     if (user) {
//         // Người dùng hợp lệ, tiếp tục xử lý và tạo JWT token
//         const userInfo = { id: user.id, email: user.email, name:user.name }; // Thay đổi theo cấu trúc thông tin người dùng
//         const jwtBearToken = jwt.sign({}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: 120, subject: userInfo.id.toString() });
//         return res.json({ token: jwtBearToken, expiresIn: 120, userInfo: userInfo });
//     } else {
//         return res.status(401).json({ "thông báo": "Thông tin đăng nhập không hợp lệ." });
//     }
// })
// })
// const checkUserPass = (em, pw, callback) => {
//     let sql = `SELECT * FROM users WHERE email = "${em}"  AND password = "${pw}"`
//     db.query(sql, (err, data) => {
//         if(err){ 
//             callback(err, null);
//         }else{
//             if(data.length > 0){
//                 callback(null, data[0])
//             }else{
//                 callback(null, null)
//             }
//         }
    
//     })
// }

app.listen(3000, () => console.log("ung dung chay voi port 3000"))