import Aos from 'aos';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const Details = () => {
    const { name } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Aos.init({ duration: 2000 });
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`http://localhost:8097/api/getupdate/${name}`);
                setData(response.data.updates[0]);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (name) {
            fetchData();
        }
    }, [name]);

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!data) {
        return <p>No data found</p>;
    }
    return (
        <div className="container bg-dark mt-5 w-100 d-flex justify-content-center pt-5 p-3">
            <div className="container text-dark p-3">
                <h4 className="card-title mb-2 text-info text-uppercase" style={{ wordSpacing: '15px' }}>
                    {data.title}
                </h4>
                <img
                    src={`http://localhost:8097/File/${data.file}`}
                    className="w-100 my-2 img-thumbnail rounded-3"
                    style={{
                        maxHeight: '550px',
                        width: '100%',
                        border: '1px solid rgb(211,23,111)',
                        boxShadow: 'black 0px 0px 15px 1px',
                        borderBottom: '3px solid rgb(211,23,111)',
                    }}
                    alt={data.title}
                    data-aos="fade-left"
                />
                {/* <center>
                    <a
                        href={data.image}
                        className="my-2 btn text-light rounded-3"
                        style={{
                            maxHeight: '550px',
                            width: '100%',
                            border: '1px solid rgb(211,23,111)',
                            boxShadow: 'black 0px 0px 15px 1px',
                            borderBottom: '3px solid rgb(211,23,111)',
                        }}
                        data-aos="fade-left"
                    >
                        Click to see video Sample...
                    </a>
                </center> */}
                <div className="card-body">
                    <div className="container mt-3 text-light">
                        <div className="card-body text-light">
                            <div className="card-title my-3 fw-bold text-light">{data.head}</div>
                            <div className="card-text my-3 text-light">
                                <div
                                    style={{ whiteSpace: 'pre-line', maxHeight: '100vh', overflowY: 'auto' }}
                                    className="mb-1"
                                    dangerouslySetInnerHTML={{ __html: data.desc }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <a href="/projects" className="btn mx-3">
                        Back
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Details;
