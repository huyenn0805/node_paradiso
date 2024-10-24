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
    host: 'localhost', user:  'root', password: '', port: 3000, database: 'datn3'
})
db.connect(err=>{
    if(err) throw err;
    console.log("Đã kết nối database");
})


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


//lấy tất cả Homestay
app.get('/homestay', function(req, res){
    let sql = `SELECT * FROM homestay`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy list homestay", err});
        else res.json(data);
    })
})

//lấy tất cả Homestay
app.get('/loaihomestay', function(req, res){
    let sql = `SELECT * FROM loai_homestay`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy list homestay", err});
        else res.json(data);
    })
})

//lấy theo loại homestay
app.get('/loaihomestay', function(req, res){
    let id_loai = parseInt(req.params.id_loai)
    if (isNaN(id_loai) || id_loai <= 0) {
        res.json({"thongbao":"Không biết loại", "id_loai": id_loai}); return;
    }
    let sql = `SELECT * FROM loai_homestay WHERE id_Loai =?`
    db.query(sql, id_loai, (err, data)=>{
        if(err) res.json({"thongbao":"Lỗi lấy  loai", err});
        else res.json(data[0]);
    })
})

// Lấy danh sách homestay theo loại
app.get('/homestay/:id_loai', function(req, res) {
    let id_loai = parseInt(req.params.id_loai);
    
    // Kiểm tra id_loai hợp lệ
    if (isNaN(id_loai) || id_loai <= 0) {
        res.json({ "thongbao": "Không biết loại", "id_loai": id_loai });
        return;
    }

    // Truy vấn lấy danh sách homestay theo id_loai
    let sql = `SELECT * FROM homestay WHERE id_loai = ?`;
    db.query(sql, id_loai, (err, data) => {
        if (err) {
            res.json({ "thongbao": "Lỗi lấy danh sách homestay", err });
        } else if (data.length === 0) {
            res.json({ "thongbao": "Không tìm thấy homestay nào cho loại này" });
        } else {
            res.json(data); // Trả về danh sách homestay
        }
    });
});


// API lấy danh sách hình ảnh của homestay
app.get('/dshinhanh', (req, res) => {
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

// ct homestay
app.get('/ct_homestay/:id', (req, res) => {
    let id = parseInt(req.params.id || 0);
    if (isNaN(id) || id <= 0) {
        res.json({ "thong bao": "Không biết homestay", id: id });
        return;
    }
    console.log('Request homestay ID:', id);
    let sql = 'SELECT * FROM homestay WHERE id_homestay = ?';
    db.query(sql, [id], (err, rows) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ message: 'Internal server error' });
        } else if (rows.length > 0) {
            res.json(rows[0]); // Trả về homestay đầu tiên
        } else {
            res.status(404).json({ message: 'Homestay not found' });
        }
    });
});

// Đăng ký, Đăng nhập
app.post('/Register', (req, res) => {
    let data = req.body;
    let sql = `INSERT INTO users SET ?`;
    db.query(sql, data, (err, data) => {
        if (err) res.json({ "thongbao": "Tài khoản đã tồn tại", err })
        else {
            res.json({ "thongbao": "Tạo tài khoản thành công", data });
        }
    });
})
app.post('/login', (req, res) => {
    const { email_user, pass_user } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email_user || !pass_user) {
        return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    // SQL query để tìm người dùng theo email
    const sql = 'SELECT * FROM users WHERE email_user = ?';
    db.query(sql, [email_user], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Có lỗi xảy ra', err });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        const user = results[0];

        if (pass_user !== user.pass_user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        res.status(200).json({
            message: 'Đăng nhập thành công',
            user: {
                id: user.id_user,
                name: user.ten_user,
                email: user.email_user,
                // dia_chi: user.dia_chi,
                dien_thoai: user.sdt_user,
                // hinh: user.hinh,
                role: user.role_id,       
            }
        });
    });
});

app.get('/admin/users', function (req, res) {
    let sql = `SELECT id_user, ten_user, email_user, role_id FROM users`; // Sử dụng đúng tên cột
    db.query(sql, (err, data) => {
        if (err) {
            res.json({ thongbao: 'Lỗi lấy danh sách người dùng', err });
        } else {
            res.json(data);
        }
    });
});

app.get('/admin/users/:id', function (req, res) {
    let id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
        res.json({ thongbao: 'Không biết người dùng', id });
        return;
    }
    let sql = `SELECT id_user, ten_user, email_user,sdt_user,role_id FROM users WHERE id_user = ?`;
    db.query(sql, id, (err, data) => {
        if (err) {
            res.json({ thongbao: 'Lỗi lấy thông tin người dùng', err });
        } else {
            res.json(data[0]);
        }
    });
});

app.post('/admin/users', function (req, res) {
    let data = req.body;
    let sql = `INSERT INTO users SET ?`;
    db.query(sql, data, (err, data) => {
        if (err) {
            res.json({ thongbao: 'Lỗi thêm người dùng', err });
        } else {
            res.json({ thongbao: 'Đã thêm người dùng', id: data.insertId });
        }
    });
});
app.put('/admin/users/:id', function (req, res) {
    let data = req.body;
    let id = req.params.id;
    let sql = 'UPDATE users SET ? WHERE id_user = ?';
    db.query(sql, [data, id], (err, d) => {
        if (err) {
            res.json({ thongbao: 'Lỗi cập nhật người dùng', err });
        } else {
            res.json({ thongbao: 'Đã cập nhật người dùng' });
        }
    });
});
app.delete('/admin/users/:id', function (req, res) {
    let id = req.params.id;
    let sql = 'DELETE FROM users WHERE id_user = ?';
    db.query(sql, id, (err, d) => {
        if (err) {
            res.json({ thongbao: 'Lỗi khi xóa người dùng', err });
        } else {
            res.json({ thongbao: 'Đã xóa người dùng' });
        }
    });
});
app.get('/api/articles', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 4; // Số bài viết trên mỗi trang
  const offset = (page - 1) * pageSize;

  db.query('SELECT COUNT(*) AS total FROM baiviet', (err, result) => {
    if (err) throw err;
    const total = result[0].total;
    const totalPages = Math.ceil(total / pageSize);

    db.query('SELECT * FROM baiviet LIMIT ?, ?', [offset, pageSize], (err, articles) => {
      if (err) throw err;
      res.json({
        articles,
        currentPage: page,
        totalPages
      });
    });
  });
});
 
// Xử lý form liên hệ
app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;

    // Kiểm tra xem có giá trị nào trống không
    if (!name || !email || !message) {
        return res.status(400).json({ "thongbao": "Vui lòng điền đầy đủ thông tin!" });
    }

    const sql = 'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)';
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error("Lỗi khi lưu dữ liệu:", err);
            return res.status(500).json({ "thongbao": "Lỗi khi gửi tin nhắn" });
        }
        res.status(200).json({ "thongbao": "Gửi tin thành công!" });
    });
});

app.listen(3000, () => console.log("ung dung chay voi port 3000"))